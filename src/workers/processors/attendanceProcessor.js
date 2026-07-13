'use strict';

const crypto = require('crypto');
const redis = require('../../utils/redis');
const logger = require('../../utils/logger');

function computeHash(subjects) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(subjects || []))
    .digest('hex');
}

async function processAttendance(session, scraper, pgClient) {
  const rollNumber = session.rollNumber;
  const { studentId } = session; // Note: studentId will be injected by the runner

  logger.info({ rollNumber }, 'Fetching current semester attendance from ERP');
  const erpData = await scraper.fetchAttendance(session);

  if (erpData.erpDbError) {
    logger.warn({ rollNumber }, 'ERP returned database error for attendance');
    throw new Error('ERP database error occurred during attendance check');
  }

  const subjects = erpData.subjects || [];
  const overallPercentage = erpData.overallPercentage || 0;
  const held = erpData.held || 0;
  const attended = erpData.attended || 0;
  const sourceHash = computeHash(subjects);
  const termLabel = erpData.termLabel || null;

  // 1. Persist in attendance_cache table
  await pgClient.query(
    `INSERT INTO attendance_cache (student_id, term_label, overall_percentage, held, attended, subjects, scraped_at, source_hash, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
     ON CONFLICT (student_id) DO UPDATE
     SET term_label = EXCLUDED.term_label,
         overall_percentage = EXCLUDED.overall_percentage,
         held = EXCLUDED.held,
         attended = EXCLUDED.attended,
         subjects = EXCLUDED.subjects,
         scraped_at = EXCLUDED.scraped_at,
         source_hash = EXCLUDED.source_hash,
         updated_at = NOW()`,
    [session.studentId, termLabel, overallPercentage, held, attended, JSON.stringify(subjects), sourceHash]
  );

  // 2. Set Redis cache for performance reads (TTL: 15 minutes)
  const cachePayload = {
    termLabel,
    overallPercentage,
    held,
    attended,
    subjects,
    scrapedAt: new Date().toISOString()
  };

  const redisKey = `attendance:${session.studentId}`;
  await redis.set(redisKey, JSON.stringify(cachePayload), { ttl: 900 }).catch((err) => {
    logger.warn({ err: err.message, studentId: session.studentId }, 'Failed to cache attendance in Redis');
  });

  logger.info({ rollNumber, subjectsCount: subjects.length }, 'Attendance processor completed successfully');
}

module.exports = processAttendance;
