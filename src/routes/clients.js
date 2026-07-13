'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const studentReadService = require('../services/studentReadService');
const credentialService = require('../services/credentialService');
const refreshService = require('../services/refreshService');
const { requireScope } = require('../middleware/apiKeyAuth');
const logger = require('../utils/logger');

// 1. GET /v1/clients/:client_id/students/:roll/academic-summary
router.get('/:client_id/students/:roll/academic-summary', requireScope('read'), async (req, res) => {
  const { roll } = req.params;
  const normalizedRoll = String(roll || '').trim().toUpperCase();

  try {
    const student = await studentReadService.getStudentByRoll(normalizedRoll);
    if (!student) {
      return res.json({
        registered: false,
        syncStatus: null,
        lastSuccessAt: null,
        data: null
      });
    }

    if (student.status === 'invalid_credentials') {
      return res.json({
        registered: true,
        syncStatus: 'failed',
        errorCode: 'INVALID_CREDENTIALS',
        lastSuccessAt: student.last_success_at,
        data: null
      });
    }

    // Determine if there are active scrape jobs (running or queued)
    const { rows: activeJobs } = await db.query(
      `SELECT id FROM scrape_jobs 
       WHERE student_id = $1 AND status IN ('queued', 'active')`,
      [student.id]
    );

    const sync = await studentReadService.getSyncStatus(student.id);

    let syncStatus = 'completed';
    let errorCode = null;

    if (activeJobs.length > 0) {
      syncStatus = 'active';
    } else if (sync && sync.last_error_code) {
      syncStatus = 'failed';
      errorCode = sync.last_error_code;
    } else if (!sync || (!sync.attendance_at && !sync.marks_at)) {
      // Registered but no jobs started/completed yet
      syncStatus = 'queued';
    }

    // Fetch cached data
    const attendance = await studentReadService.getCachedAttendance(student.id);
    const marksAndSpf = await studentReadService.getMarksAndSpf(student.id);

    // Auto-trigger background refresh if completed but stale (older than 4 hours for attendance)
    if (syncStatus === 'completed' && attendance && attendance.scraped_at) {
      const isStale = (Date.now() - new Date(attendance.scraped_at).getTime()) > 4 * 3600 * 1000;
      if (isStale) {
        logger.info({ rollNumber: normalizedRoll, studentId: student.id }, 'Academic summary cache stale, enqueuing background sync');
        refreshService.enqueueRefresh(student.id, normalizedRoll, 'attendance', req.clientId).catch((err) => {
          logger.warn({ err: err.message, studentId: student.id }, 'Stale summary auto-refresh enqueue failed');
        });
      }
    }

    return res.json({
      registered: true,
      syncStatus,
      errorCode,
      lastSuccessAt: student.last_success_at,
      data: syncStatus === 'completed' ? {
        attendance: attendance ? {
          overallPercentage: parseFloat(attendance.overall_percentage),
          held: attendance.held,
          attended: attendance.attended,
          scrapedAt: attendance.scraped_at,
          subjects: attendance.subjects || []
        } : null,
        marks: marksAndSpf.exams || [],
        spfBands: marksAndSpf.spfBands || []
      } : null
    });
  } catch (err) {
    logger.error({ err: err.message, roll }, 'Failed to fetch academic summary in clients integration router');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to retrieve academic summary'
    });
  }
});

// 2. POST /v1/clients/:client_id/students/:roll/register
router.post('/:client_id/students/:roll/register', requireScope('register'), async (req, res) => {
  const { roll } = req.params;
  const { password } = req.body;
  const normalizedRoll = String(roll || '').trim().toUpperCase();

  if (!password) {
    return res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'password is required'
    });
  }

  try {
    const result = await credentialService.registerStudent(
      normalizedRoll,
      password,
      req.clientId
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered and initial sync enqueued successfully',
      data: {
        studentId: result.studentId,
        rollNumber: result.rollNumber,
        status: 'provisioning',
        syncJobs: result.syncJobs
      }
    });
  } catch (err) {
    logger.warn({ err: err.message, roll }, 'Client student registration endpoint failed');

    if (err instanceof credentialService.CredentialError || err.name === 'CredentialError') {
      const statusCode = err.statusCode || 400;
      let errorCode = 'BAD_REQUEST';
      if (statusCode === 401) errorCode = 'INVALID_CREDENTIALS';
      else if (statusCode === 500) errorCode = 'DATABASE_ERROR';

      return res.status(statusCode).json({
        success: false,
        code: errorCode,
        message: err.message
      });
    }

    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Internal server error occurred during registration'
    });
  }
});

// 3. POST /v1/clients/:client_id/students/:roll/refresh
router.post('/:client_id/students/:roll/refresh', requireScope('refresh'), async (req, res) => {
  const { roll } = req.params;
  const normalizedRoll = String(roll || '').trim().toUpperCase();

  try {
    const student = await studentReadService.getStudentByRoll(normalizedRoll);
    if (!student) {
      return res.status(404).json({
        success: false,
        code: 'STUDENT_NOT_FOUND',
        message: `No registered student found for roll number ${normalizedRoll}`
      });
    }

    // Coalescing: If a sync is already active/queued in the last 15 minutes, skip enqueuing
    const { rows: activeJobs } = await db.query(
      `SELECT id FROM scrape_jobs 
       WHERE student_id = $1 AND status IN ('queued', 'active')
         AND enqueued_at > NOW() - INTERVAL '15 minutes'`,
      [student.id]
    );

    if (activeJobs.length > 0) {
      logger.info({ rollNumber: normalizedRoll, studentId: student.id }, 'Coalescing refresh request. Scrape jobs are already active.');
      return res.status(202).json({
        success: true,
        message: 'Sync is already active. Refresh request coalesced.'
      });
    }

    const jobIds = await refreshService.enqueueInitialSync(
      student.id,
      normalizedRoll,
      req.clientId
    );

    return res.status(202).json({
      success: true,
      message: 'Manual refresh sync jobs enqueued successfully',
      data: {
        syncJobs: jobIds
      }
    });
  } catch (err) {
    logger.error({ err: err.message, roll }, 'Manual client refresh request failed');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to schedule refresh jobs'
    });
  }
});

module.exports = router;
