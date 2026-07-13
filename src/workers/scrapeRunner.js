'use strict';

const db = require('../db/pool');
const ScraperClient = require('../services/scraper/client');
const credentialService = require('../services/credentialService');
const semaphore = require('../utils/scrapeSemaphore');
const logger = require('../utils/logger');

async function runScrape(job, workerFn) {
  const { studentId, rollNumber, module, dbJobId } = job.data;
  
  logger.info({ studentId, rollNumber, module }, 'Scrape worker job started');

  // 1. Update job status to active
  await db.query(
    `UPDATE scrape_jobs 
     SET status = 'active', started_at = NOW(), attempts = attempts + 1 
     WHERE id = $1`,
    [dbJobId]
  ).catch((err) => {
    logger.warn({ err: err.message, dbJobId }, 'Failed to set job status to active');
  });

  // 2. Fetch student credentials
  const password = await credentialService.getCredential(studentId);
  if (!password) {
    const errorMsg = 'No active credentials found for the student';
    await markJobFailed(dbJobId, studentId, module, 'NO_CREDENTIALS', errorMsg);
    throw new Error(errorMsg);
  }

  // 3. Acquire concurrency slot locks
  const lockAcquired = await semaphore.acquire(studentId);
  if (!lockAcquired) {
    const errorMsg = 'Concurrency lock acquisition timed out';
    await markJobFailed(dbJobId, studentId, module, 'LOCK_TIMEOUT', errorMsg);
    throw new Error(errorMsg);
  }

  const scraper = new ScraperClient();
  let session = null;
  let pgClient = null;

  try {
    // 4. Log in to college ERP
    session = await scraper.login(rollNumber, password);

    // 5. Open database connection for transaction/persistence
    pgClient = await db.getClient();
    
    // 6. Execute module parsing and persistence
    await workerFn(session, scraper, pgClient);

    // 7. Update job status to completed
    await pgClient.query(
      `UPDATE scrape_jobs 
       SET status = 'completed', finished_at = NOW() 
       WHERE id = $1`,
      [dbJobId]
    );

    // 8. Update sync status
    const statusCol = `${module}_at`;
    await pgClient.query(
      `UPDATE sync_status 
       SET ${statusCol} = NOW(), last_error_code = NULL, last_error_at = NULL, updated_at = NOW() 
       WHERE student_id = $1`,
      [studentId]
    );

    logger.info({ studentId, rollNumber, module }, 'Scrape worker job completed successfully');
  } catch (err) {
    logger.error({ err: err.message, studentId, rollNumber, module }, 'Scrape worker execution failed');
    await markJobFailed(dbJobId, studentId, module, err.code || 'SCRAPE_FAILED', err.message);
    throw err;
  } finally {
    // Release locks and connection
    if (pgClient) {
      pgClient.release();
    }
    if (session) {
      await scraper.logout(session).catch(() => {});
    }
    await semaphore.release(studentId);
  }
}

async function markJobFailed(dbJobId, studentId, module, errorCode, errorMessage) {
  try {
    await db.query(
      `UPDATE scrape_jobs 
       SET status = CASE WHEN attempts >= 5 THEN 'dead'::text ELSE 'failed'::text END, 
           last_error_code = $1, 
           last_error = $2, 
           finished_at = NOW() 
       WHERE id = $3`,
      [errorCode, errorMessage, dbJobId]
    );

    await db.query(
      `UPDATE sync_status 
       SET last_error_code = $1, last_error_at = NOW(), updated_at = NOW() 
       WHERE student_id = $2`,
      [errorCode, studentId]
    );
  } catch (err) {
    logger.error({ err: err.message, dbJobId }, 'Failed to mark job status as failed in database');
  }
}

module.exports = {
  runScrape
};
