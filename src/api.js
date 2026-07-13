'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const config = require('./config');
const logger = require('./utils/logger');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { apiRateLimiter } = require('./middleware/rateLimit');

const healthRouter = require('./routes/health');
const metricsRouter = require('./routes/metrics');
const registerRouter = require('./routes/register');
const studentsRouter = require('./routes/students');
const clientsRouter = require('./routes/clients');

const app = express();

// 1. Trust proxy (Crucial for getting real client IP behind Nginx reverse proxy)
app.set('trust proxy', 1);

// 2. Global Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by');

// 3. CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for the public B2B API
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// 4. Body parsing & request context
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// 5. Logging incoming requests
if (config.env !== 'test') {
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - t0;
      logger.info({
        reqId: req.id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms,
        ip: req.ip
      }, 'Request processed');
    });
    next();
  });
}

// 6. Mount public/unauthenticated routes
app.use('/health', healthRouter);
app.use('/metrics', metricsRouter);

// 7. Mount authenticated, rate-limited routes
app.use('/v1/register', apiRateLimiter, apiKeyAuth, registerRouter);
app.use('/v1/students', apiRateLimiter, apiKeyAuth, studentsRouter);
app.use('/v1/clients', apiRateLimiter, apiKeyAuth, clientsRouter);

// 8. 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'The requested route does not exist'
  });
});

// 9. Centralized Error Handler
app.use((err, req, res, next) => {
  logger.error({ err: err.message, reqId: req.id, stack: err.stack }, 'Unhandled application error occurred');

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message: err.message || 'Internal server error occurred'
  });
});

// Start API Server
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'College ERP Data Service (EDS) API started successfully');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing API server gracefully');
  const shutdown = async () => {
    const db = require('./db/pool');
    const redis = require('./utils/redis');
    await db.end();
    await redis.disconnect();
    logger.info('Clean API shutdown completed. Exiting.');
    process.exit(0);
  };
  if (server) {
    server.close(shutdown);
  } else {
    shutdown();
  }
});

module.exports = app;
