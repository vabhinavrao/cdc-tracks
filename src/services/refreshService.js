'use strict';

const queueClient = require('../utils/queue');
const db = require('../db/pool');
const logger = require('../utils/logger');

const MODULE_TO_QUEUE = {
  attendance: queueClient.QUEUE_NAMES.ATTENDANCE,
  marks: queueClient.QUEUE_NAMES.MARKS,
  semester: queueClient.QUEUE_NAMES.SEMESTER,
};

async function enqueueRefresh(studentId, rollNumber, module, clientId = null) {
  const queueName = MODULE_TO_QUEUE[module];
  if (!queueName) {
    throw new Error(`Unsupported sync module: ${module}`);
  }

  const queue = queueClient.getQueue(queueName);
  const jobId = `${module}-${rollNumber}-${Date.now()}`; // Unique job ID with timestamp to prevent BullMQ deduplication blocking subsequent runs

  const jobData = {
    studentId,
    rollNumber,
    module,
    clientId,
    enqueuedAt: new Date().toISOString()
  };

  try {
    // Inserts or gets a pending job record in database for audit trail.
    const jobRes = await db.query(
      `INSERT INTO scrape_jobs (student_id, roll_number, module, bull_job_id, status, client_id, enqueued_at)
       VALUES ($1, $2, $3, $4, 'queued', $5, NOW())
       RETURNING id`,
      [studentId, rollNumber, module, jobId, clientId]
    );
    const dbJobId = jobRes.rows[0].id;

    // Add to BullMQ queue with deduplicated jobId
    await queue.add('scrape', { ...jobData, dbJobId }, {
      jobId,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      }
    });

    logger.info({ rollNumber, module, jobId }, 'Scrape job enqueued successfully');
    return dbJobId;
  } catch (err) {
    logger.error({ err: err.message, rollNumber, module }, 'Failed to enqueue scrape job');
    throw err;
  }
}

async function enqueueInitialSync(studentId, rollNumber, clientId = null) {
  const modules = ['attendance', 'marks', 'semester'];
  const jobIds = {};

  for (const module of modules) {
    const jobDbId = await enqueueRefresh(studentId, rollNumber, module, clientId);
    jobIds[module] = jobDbId;
  }

  return jobIds;
}

module.exports = {
  enqueueRefresh,
  enqueueInitialSync,
  MODULE_TO_QUEUE
};
