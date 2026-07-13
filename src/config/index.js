'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { enforceEnv } = require('./enforceEnv');

// Load environment variables.
const envFile = (process.env.ENV_FILE || '').trim();
if (envFile) {
  dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });
} else {
  // Try loading standard .env or .env.eds in the project root
  const rootEnvPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: rootEnvPath });
  if (result.error) {
    const edsEnvPath = path.resolve(__dirname, '../../.env.eds');
    const resultEds = dotenv.config({ path: edsEnvPath });
    if (resultEds.error) {
      dotenv.config(); // fallback to current working directory .env
    }
  }
}

// Fails fast if any variable is invalid.
enforceEnv();

function optionalEnv(name, defaultValue) {
  return (process.env[name] || defaultValue || '').trim();
}

module.exports = {
  env: process.env.NODE_ENV,
  port: parseInt(optionalEnv('PORT', '3101'), 10),
  db: {
    url: process.env.DATABASE_URL.trim(),
    ssl: process.env.DATABASE_SSL === 'true',
    sslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    sslCaCert: process.env.DATABASE_SSL_CA_CERT || null,
    poolMax: parseInt(optionalEnv('DB_POOL_MAX', '10'), 10),
  },
  redis: {
    url: process.env.REDIS_URL.trim(),
    keyPrefix: process.env.REDIS_PREFIX || process.env.REDIS_KEY_PREFIX || 'eds:',
  },
  bullmq: {
    prefix: process.env.BULLMQ_PREFIX || 'eds',
  },
  crypto: {
    encryptionKey: process.env.EDS_ENCRYPTION_KEY.trim(),
    encryptionKeyVersion: parseInt(optionalEnv('EDS_ENCRYPTION_KEY_VERSION', '1'), 10),
  },
  jwt: {
    secret: process.env.EDS_JWT_SECRET.trim(),
    expiresIn: '24h',
  },
  admin: {
    apiKey: process.env.EDS_ADMIN_API_KEY.trim(),
  },
  scraper: {
    httpTimeoutMs: parseInt(optionalEnv('HTTP_TIMEOUT_MS', '15000'), 10),
    loginTimeoutMs: parseInt(optionalEnv('LOGIN_TIMEOUT_MS', '8000'), 10),
    maxConcurrentSessions: parseInt(optionalEnv('EDS_MAX_ERP_SESSIONS', '2'), 10),
  },
  worker: {
    maxConcurrent: parseInt(optionalEnv('EDS_MAX_CONCURRENT_JOBS', '2'), 10),
    queueSoftLimit: parseInt(optionalEnv('QUEUE_SOFT_LIMIT', '50'), 10),
    queueHardLimit: parseInt(optionalEnv('QUEUE_HARD_LIMIT', '100'), 10),
  },
};
