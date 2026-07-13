'use strict';

const express = require('express');
const router = express.Router();
const client = require('prom-client');
const logger = require('../utils/logger');

// Enable default system metrics gathering
client.collectDefaultMetrics();

router.get('/', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error({ err: err.message }, 'Metrics endpoint generation failed');
    res.status(500).end('Metrics unavailable');
  }
});

module.exports = router;
