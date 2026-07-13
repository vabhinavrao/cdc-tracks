'use strict';

const redis = require('./redis');
const config = require('../config');
const logger = require('./logger');

const SEM_KEY = 'active_sessions';
const MAX_SESSIONS = config.scraper.maxConcurrentSessions || 2;
const LOCK_TTL = 90; // seconds before key auto-expires to prevent deadlocks

async function acquire(studentId) {
  const client = redis.getClient();
  const rollLockKey = `lock:session:${studentId}`;
  
  // 1. Prevent duplicate concurrent requests for the SAME student (wait up to 15 seconds)
  let rollAttempts = 0;
  const maxRollAttempts = 30; // 30 * 500ms = 15 seconds
  let locked = false;

  while (rollAttempts < maxRollAttempts) {
    locked = await redis.setNx(rollLockKey, '1', LOCK_TTL);
    if (locked) {
      break;
    }
    rollAttempts++;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!locked) {
    logger.warn({ studentId }, '[semaphore] Scrape lock already held for student (timeout)');
    return false;
  }

  // 2. Enforce global max concurrent ERP sessions
  let attempts = 0;
  const maxAttempts = 15; // Wait up to 15 seconds

  while (attempts < maxAttempts) {
    const active = await client.incr(redis.PREFIX + SEM_KEY);
    
    if (active <= MAX_SESSIONS) {
      // Slot acquired successfully
      logger.debug({ active, studentId }, '[semaphore] Acquired global session slot');
      return true;
    }
    
    // Decr if we exceeded the slot limit
    await client.decr(redis.PREFIX + SEM_KEY);
    attempts++;
    
    // Wait 1 second before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Cleanup local roll lock if global lock failed to acquire
  await redis.del(rollLockKey);
  logger.warn({ studentId }, '[semaphore] Global session acquisition timed out');
  return false;
}

async function release(studentId) {
  const client = redis.getClient();
  const rollLockKey = `lock:session:${studentId}`;

  try {
    await redis.del(rollLockKey);
    const active = await client.get(redis.PREFIX + SEM_KEY);
    if (active && parseInt(active, 10) > 0) {
      await client.decr(redis.PREFIX + SEM_KEY);
      logger.debug({ studentId }, '[semaphore] Released global session slot');
    }
  } catch (err) {
    logger.warn({ err: err.message, studentId }, '[semaphore] Failed to release slot cleanly');
  }
}

module.exports = {
  acquire,
  release
};
