'use strict';

const db = require('../db/pool');
const crypto = require('../utils/crypto');
const ScraperClient = require('./scraper/client');
const logger = require('../utils/logger');

class CredentialError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CredentialError';
    this.statusCode = statusCode;
  }
}

async function validateCredentialAgainstErp(rollNumber, password) {
  const scraper = new ScraperClient();
  let session;
  try {
    session = await scraper.login(rollNumber, password);
  } catch (err) {
    return { valid: false, reason: err.message };
  }

  try {
    await scraper.logout(session);
  } catch {
    // best-effort logout; validation already succeeded
  }

  return { valid: true };
}

async function registerStudent(rollNumber, password, clientId = null) {
  const normalizedRoll = String(rollNumber || '').trim().toUpperCase();
  if (!normalizedRoll || !password) {
    throw new CredentialError('rollNumber and password are required', 400);
  }

  // Basic format check
  if (!/^[A-Z0-9]{10}$/.test(normalizedRoll)) {
    throw new CredentialError('Invalid roll number format: must be 10 alphanumeric characters', 400);
  }

  // Validate credentials and retrieve profile details synchronously
  logger.info({ rollNumber: normalizedRoll }, 'Validating credentials and fetching profile details');
  const scraper = new ScraperClient();
  let session;
  let profileData = null;
  try {
    session = await scraper.login(normalizedRoll, password);
    profileData = await scraper.fetchProfile(session);
  } catch (err) {
    logger.warn({ rollNumber: normalizedRoll, reason: err.message }, 'ERP validation failed');
    throw new CredentialError(`ERP validation failed: ${err.message}`, 401);
  } finally {
    if (session) {
      await scraper.logout(session).catch(() => {});
    }
  }

  const passwordEnc = crypto.encrypt(password);
  const pgClient = await db.getClient();

  try {
    await pgClient.query('BEGIN');

    // 1. Upsert Student Profile canonical row with name & branch
    const studentRes = await pgClient.query(
      `INSERT INTO students (roll_number, name, branch, status, updated_at)
       VALUES ($1, $2, $3, 'active', NOW())
       ON CONFLICT (college_id, roll_number) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, students.name),
           branch = COALESCE(EXCLUDED.branch, students.branch),
           status = 'active',
           updated_at = NOW()
       RETURNING id, name, branch`,
      [normalizedRoll, profileData ? profileData.name : null, profileData ? profileData.branch : null]
    );
    const studentId = studentRes.rows[0].id;
    const studentName = studentRes.rows[0].name;
    const studentBranch = studentRes.rows[0].branch;

    // 2. Upsert Encrypted ERP Credentials
    await pgClient.query(
      `INSERT INTO erp_credentials (student_id, roll_number, password_enc, last_validated_at, invalid_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NULL, NOW())
       ON CONFLICT (student_id) DO UPDATE
       SET password_enc = EXCLUDED.password_enc,
           last_validated_at = NOW(),
           invalid_at = NULL,
           updated_at = NOW()`,
      [studentId, normalizedRoll, passwordEnc]
    );

    // 3. Upsert Sync Status tracking
    await pgClient.query(
      `INSERT INTO sync_status (student_id, updated_at)
       VALUES ($1, NOW())
       ON CONFLICT (student_id) DO NOTHING`,
      [studentId]
    );

    await pgClient.query('COMMIT');
    logger.info({ rollNumber: normalizedRoll, studentId }, 'Student successfully registered');

    // Queue background jobs for attendance, marks, and semester results
    const refreshService = require('./refreshService');
    const jobIds = await refreshService.enqueueInitialSync(studentId, normalizedRoll, clientId);

    return {
      success: true,
      studentId,
      rollNumber: normalizedRoll,
      name: studentName,
      branch: studentBranch,
      syncJobs: jobIds
    };
  } catch (err) {
    await pgClient.query('ROLLBACK').catch(() => {});
    logger.error({ err: err.message, rollNumber: normalizedRoll }, 'Registration transaction failed');
    throw new CredentialError('Registration failed database transaction', 500);
  } finally {
    pgClient.release();
  }
}

async function getCredential(studentId) {
  const { rows } = await db.query(
    `SELECT password_enc FROM erp_credentials WHERE student_id = $1 AND invalid_at IS NULL`,
    [studentId]
  );
  if (rows.length === 0) return null;
  return crypto.decrypt(rows[0].password_enc);
}

module.exports = {
  CredentialError,
  validateCredentialAgainstErp,
  registerStudent,
  getCredential
};
