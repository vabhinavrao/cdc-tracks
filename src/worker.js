'use strict';

// Load config and validate env immediately
const config = require('./config');
const logger = require('./utils/logger');
const { createWorker, QUEUE_NAMES } = require('./utils/queue');
const { runScrape } = require('./workers/scrapeRunner');

const attendanceProcessor = require('./workers/processors/attendanceProcessor');
const marksProcessor = require('./workers/processors/marksProcessor');
const semesterProcessor = require('./workers/processors/semesterProcessor');

logger.info('[worker] Starting background sync worker processes');

// 1. Attendance Queue Worker
const attendanceWorker = createWorker(QUEUE_NAMES.ATTENDANCE, async (job) => {
  await runScrape(job, async (session, scraper, pgClient) => {
    session.studentId = job.data.studentId;
    await attendanceProcessor(session, scraper, pgClient);
  });
}, { concurrency: config.worker.maxConcurrent });

// 2. Marks Queue Worker
const marksWorker = createWorker(QUEUE_NAMES.MARKS, async (job) => {
  await runScrape(job, async (session, scraper, pgClient) => {
    session.studentId = job.data.studentId;
    await marksProcessor(session, scraper, pgClient);
  });
}, { concurrency: 1 }); // Strict concurrency limit of 1 to prevent ERP marks page locking

// 3. Semester/Profile Queue Worker
const semesterWorker = createWorker(QUEUE_NAMES.SEMESTER, async (job) => {
  await runScrape(job, async (session, scraper, pgClient) => {
    session.studentId = job.data.studentId;
    await semesterProcessor(session, scraper, pgClient);
  });
}, { concurrency: 1 });

// Helper to bind standard telemetry listeners
function bindListeners(name, worker) {
  worker.on('active', (job) => {
    logger.info({ queue: name, jobId: job.id }, 'Job is now active');
  });

  worker.on('completed', (job, result) => {
    logger.info({ queue: name, jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { queue: name, jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      'Job execution failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ queue: name, err: err.message }, 'Worker encountered a connection error');
  });
}

bindListeners('attendance-refresh', attendanceWorker);
bindListeners('marks-refresh', marksWorker);
bindListeners('semester-refresh', semesterWorker);

process.on('SIGTERM', async () => {
  logger.info('[worker] SIGTERM received. Shutting down queue workers gracefully');
  const { closeAll } = require('./utils/queue');
  const db = require('./db/pool');
  const redis = require('./utils/redis');

  await closeAll();
  await db.end();
  await redis.disconnect();
  logger.info('[worker] Clean shutdown complete. Exiting.');
  process.exit(0);
});
