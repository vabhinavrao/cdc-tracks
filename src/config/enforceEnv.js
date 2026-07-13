'use strict';

const { URL } = require('url');

function validateEnv() {
  const issues = [];

  function fatal(msg) {
    issues.push({ level: 'fatal', message: msg });
  }

  // 1. Database isolation (DATABASE_URL must target /erp_data)
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    fatal('DATABASE_URL is not set');
  } else {
    try {
      const dbName = new URL(databaseUrl).pathname.replace(/^\//, '').trim();
      if (dbName !== 'erp_data' && dbName !== 'erp_data_test') {
        fatal(`DATABASE_URL must target /erp_data or /erp_data_test (got "/${dbName}")`);
      }
    } catch {
      fatal('DATABASE_URL is not a valid URL');
    }
  }

  // 2. Redis isolation (REDIS_URL must be set)
  const redisUrl = (process.env.REDIS_URL || '').trim();
  if (!redisUrl) {
    fatal('REDIS_URL is not set');
  } else {
    try {
      new URL(redisUrl);
    } catch {
      fatal('REDIS_URL is not a valid URL');
    }
  }

  // 3. Redis and BullMQ prefixes
  const redisPrefix = (process.env.REDIS_PREFIX || '').trim();
  const redisKeyPrefix = (process.env.REDIS_KEY_PREFIX || '').trim();
  const prefixVal = redisPrefix || redisKeyPrefix || '';
  if (prefixVal !== 'eds:') {
    fatal(`REDIS_PREFIX / REDIS_KEY_PREFIX must be "eds:" (got "${prefixVal}")`);
  }

  const bullmqPrefix = (process.env.BULLMQ_PREFIX || '').trim();
  if (bullmqPrefix !== 'eds') {
    fatal(`BULLMQ_PREFIX must be "eds" (got "${bullmqPrefix}")`);
  }

  // 4. EDS Encryption key
  const erpKey = (process.env.EDS_ENCRYPTION_KEY || '').trim();
  if (!erpKey) {
    fatal('EDS_ENCRYPTION_KEY is not set');
  } else if (erpKey.length !== 64) {
    fatal(`EDS_ENCRYPTION_KEY must be exactly 64 hex characters (got ${erpKey.length})`);
  } else if (!/^[0-9a-fA-F]{64}$/.test(erpKey)) {
    fatal('EDS_ENCRYPTION_KEY is not valid hex');
  }

  // 5. JWT Secret
  const jwtSecret = (process.env.EDS_JWT_SECRET || '').trim();
  if (!jwtSecret) {
    fatal('EDS_JWT_SECRET is not set');
  } else if (jwtSecret.length < 32) {
    fatal(`EDS_JWT_SECRET must be at least 32 characters (got ${jwtSecret.length})`);
  }

  // 6. Admin API Key
  const adminApiKey = (process.env.EDS_ADMIN_API_KEY || '').trim();
  if (!adminApiKey) {
    fatal('EDS_ADMIN_API_KEY is not set');
  }

  // 7. Node Env
  const nodeEnv = (process.env.NODE_ENV || '').trim();
  if (!nodeEnv) {
    fatal('NODE_ENV is not set');
  }

  return issues;
}

function enforceEnv() {
  const issues = validateEnv();
  const failures = issues.filter(i => i.level === 'fatal');

  if (failures.length > 0) {
    const message = `EDS Environment validation failed (${failures.length} issue${failures.length > 1 ? 's' : ''}):\n` +
      failures.map((f, i) => `  ${i + 1}. ${f.message}`).join('\n');
    throw new Error(message);
  }
}

module.exports = { enforceEnv, validateEnv };
