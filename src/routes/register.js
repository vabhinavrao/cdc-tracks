'use strict';

const express = require('express');
const router = express.Router();
const credentialService = require('../services/credentialService');
const { requireScope } = require('../middleware/apiKeyAuth');
const logger = require('../utils/logger');

router.post('/', requireScope('register'), async (req, res) => {
  const { rollNumber, password } = req.body;

  if (!rollNumber || !password) {
    return res.status(400).json({
      success: false,
      code: 'BAD_REQUEST',
      message: 'rollNumber and password are required in the request body'
    });
  }

  try {
    const result = await credentialService.registerStudent(
      rollNumber,
      password,
      req.clientId
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered and initial sync enqueued successfully',
      data: {
        studentId: result.studentId,
        rollNumber: result.rollNumber,
        name: result.name,
        branch: result.branch,
        status: 'provisioning',
        syncJobs: result.syncJobs
      }
    });
  } catch (err) {
    logger.warn({ err: err.message, rollNumber }, 'Student registration endpoint failed');

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

module.exports = router;
