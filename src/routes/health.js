'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

// 1. Liveness check (lightweight)
router.get('/', (_req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 2. Readiness check (checks DB & Redis connection health)
router.get('/ready', async (_req, res) => {
  const checks = {
    db: false,
    redis: false
  };

  try {
    await db.query('SELECT 1');
    checks.db = true;
  } catch (err) {
    logger.error({ err: err.message }, '[health/ready] Postgres check failed');
  }

  try {
    const redisClient = redis.getClient();
    await redisClient.ping();
    checks.redis = true;
  } catch (err) {
    logger.error({ err: err.message }, '[health/ready] Redis check failed');
  }

  const ok = checks.db && checks.redis;

  return res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
