'use strict';

const express = require('express');
const router = express.Router();
const studentReadService = require('../services/studentReadService');
const refreshService = require('../services/refreshService');
const redis = require('../utils/redis');
const { requireScope } = require('../middleware/apiKeyAuth');
const logger = require('../utils/logger');

// Middleware to resolve roll parameter to student record
async function resolveStudent(req, res, next) {
  const { roll } = req.params;
  try {
    const student = await studentReadService.getStudentByRoll(roll);
    if (!student) {
      return res.status(404).json({
        success: false,
        code: 'STUDENT_NOT_FOUND',
        message: `No registered student found for roll number ${roll}`
      });
    }
    req.student = student;
    next();
  } catch (err) {
    logger.error({ err: err.message, roll }, 'Failed to resolve student by roll number');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to retrieve student record'
    });
  }
}

// 1. GET /v1/students/:roll/profile
router.get('/:roll/profile', requireScope('read'), resolveStudent, async (req, res) => {
  const syncStatus = await studentReadService.getSyncStatus(req.student.id);
  return res.json({
    success: true,
    data: {
      studentId: req.student.id,
      rollNumber: req.student.roll_number,
      name: req.student.name,
      branch: req.student.branch,
      program: req.student.program,
      status: req.student.status,
      syncStatus
    }
  });
});

// 2. GET /v1/students/:roll/attendance
router.get('/:roll/attendance', requireScope('read'), resolveStudent, async (req, res) => {
  const student = req.student;
  let cached = null;
  const redisKey = `attendance:${student.id}`;

  try {
    const raw = await redis.get(redisKey);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (err) {
    logger.warn({ err: err.message, studentId: student.id }, 'Redis cache read failed');
  }

  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json({
      success: true,
      data: cached
    });
  }

  const dbData = await studentReadService.getCachedAttendance(student.id);
  res.setHeader('X-Cache', dbData ? 'DB' : 'MISS');

  // Trigger background refresh if missing or stale (older than 15 minutes)
  const isStale = !dbData || (Date.now() - new Date(dbData.scraped_at).getTime() > 900 * 1000);
  if (isStale) {
    refreshService.enqueueRefresh(student.id, student.roll_number, 'attendance', req.clientId).catch((err) => {
      logger.warn({ err: err.message, studentId: student.id }, 'Auto-refresh enqueue failed');
    });
  }

  return res.json({
    success: true,
    data: dbData ? {
      termLabel: dbData.term_label,
      overallPercentage: parseFloat(dbData.overall_percentage),
      held: dbData.held,
      attended: dbData.attended,
      subjects: dbData.subjects || [],
      scrapedAt: dbData.scraped_at
    } : {
      termLabel: null,
      overallPercentage: 0,
      held: 0,
      attended: 0,
      subjects: [],
      scrapedAt: null
    }
  });
});

// 3. GET /v1/students/:roll/marks
router.get('/:roll/marks', requireScope('read'), resolveStudent, async (req, res) => {
  try {
    const data = await studentReadService.getMarksAndSpf(req.student.id);
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    logger.error({ err: err.message, studentId: req.student.id }, 'Failed to load student marks');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to retrieve student marks'
    });
  }
});

// 4. GET /v1/students/:roll/sync-status
router.get('/:roll/sync-status', requireScope('read'), resolveStudent, async (req, res) => {
  try {
    const syncStatus = await studentReadService.getSyncStatus(req.student.id);
    return res.json({
      success: true,
      data: syncStatus
    });
  } catch (err) {
    logger.error({ err: err.message, studentId: req.student.id }, 'Failed to load sync status');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to retrieve sync status'
    });
  }
});

// 5. POST /v1/students/:roll/refresh
router.post('/:roll/refresh', requireScope('refresh'), resolveStudent, async (req, res) => {
  try {
    const jobIds = await refreshService.enqueueInitialSync(
      req.student.id,
      req.student.roll_number,
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
    logger.error({ err: err.message, studentId: req.student.id }, 'Manual refresh request failed');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to schedule refresh jobs'
    });
  }
});

module.exports = router;
