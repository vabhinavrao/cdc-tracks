'use strict';

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const DATABASE_NAME = config.env === 'test' ? 'erp_data_test' : 'erp_data';

function createPool() {
  const connectionString = config.db.url;

  if (!connectionString.includes(`/${DATABASE_NAME}`)) {
    throw new Error(
      `[db/pool] DATABASE_URL must connect to ${DATABASE_NAME}. ` +
      `Got: ${connectionString.replace(/:([^@]+)@/, ':***@')}`
    );
  }

  const sslOpts = config.db.ssl
    ? {
        rejectUnauthorized: config.db.sslRejectUnauthorized,
        ...(config.db.sslCaCert ? { ca: config.db.sslCaCert } : {}),
      }
    : false;

  const pool = new Pool({
    connectionString,
    ssl: sslOpts,
    max: config.db.poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
    application_name: 'erp_data_service',
  });

  pool.on('error', (err) => {
    logger.error({ err }, '[db/pool] idle client error');
  });

  return pool;
}

let _pool = null;

function getPool() {
  if (!_pool) {
    _pool = createPool();
  }
  return _pool;
}

async function query(text, params = []) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

async function getClient() {
  const pool = getPool();
  return pool.connect();
}

async function end() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

module.exports = { getPool, query, getClient, end, DATABASE_NAME };
