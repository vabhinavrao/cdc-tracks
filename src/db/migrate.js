'use strict';

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const config = require('../config');
const logger = require('../utils/logger');
const { DATABASE_NAME } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const url = config.db.url;
  if (!url) {
    logger.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }

  if (!url.includes(`/${DATABASE_NAME}`)) {
    logger.error(`[migrate] DATABASE_URL must target ${DATABASE_NAME}`);
    process.exit(1);
  }

  const sslOpts = config.db.ssl
    ? {
        rejectUnauthorized: config.db.sslRejectUnauthorized,
        ...(config.db.sslCaCert ? { ca: config.db.sslCaCert } : {}),
      }
    : false;

  logger.info(`[migrate] Connecting to: ${url.replace(/:([^@]+)@/, ':***@')}`);

  const pool = new Pool({
    connectionString: url,
    ssl: sslOpts,
    connectionTimeoutMillis: 15000,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger.info('[migrate] No migrations directory found. Nothing to apply.');
      return;
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.info('[migrate] No migration files found.');
      return;
    }

    const { rows: applied } = await pool.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.version));

    let appliedCount = 0;

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');

      if (appliedSet.has(version)) {
        logger.debug(`[migrate] Already applied: ${version}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      logger.info(`[migrate] Applying: ${version}`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        // Note: The SQL file itself may insert into schema_migrations,
        // but we also do it explicitly to guarantee version tracking.
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [version]
        );
        await client.query('COMMIT');
        logger.info(`[migrate] Applied: ${version}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        logger.error({ err }, `[migrate] Failed: ${version}`);
        process.exit(1);
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      logger.info('[migrate] All migrations already applied.');
    } else {
      logger.info(`[migrate] ${appliedCount} migration(s) applied successfully.`);
    }
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  logger.error({ err }, '[migrate] Migration runner crashed');
  process.exit(1);
});
