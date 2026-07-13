'use strict';

const pino = require('pino');

// Standalone request and error serializers for safety.
function reqSerializer(req) {
  if (!req) return req;
  const headers = { ...req.headers };
  
  // Redact security-sensitive headers.
  if (headers.authorization) headers.authorization = '[REDACTED]';
  if (headers.cookie) headers.cookie = '[REDACTED]';
  if (headers['x-api-key']) headers['x-api-key'] = '[REDACTED]';

  return {
    method: req.method,
    url: req.url,
    headers,
    ip: req.ip,
  };
}

function errSerializer(err) {
  if (!err) return err;
  return {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
  };
}

const logger = pino(
  process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
        level: 'debug',
        serializers: { req: reqSerializer, err: errSerializer },
      }
    : {
        level: 'info',
        serializers: { req: reqSerializer, err: errSerializer },
        redact: {
          paths: [
            'password',
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'password_enc',
            'passwordEnc',
            'apiKey',
            'key',
          ],
          censor: '[REDACTED]',
        },
      }
);

module.exports = logger;
