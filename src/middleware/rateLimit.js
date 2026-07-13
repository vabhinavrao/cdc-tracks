'use strict';

const rateLimit = require('express-rate-limit');

// Simple, high-performance in-memory rate limiter for development/production
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: (req) => {
    // API keys can have higher rate limits if needed; otherwise defaults to 60 RPM
    return req.apiKeyId ? 120 : 60;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded. Please wait a minute before retrying.'
  },
  keyGenerator: (req) => {
    // Rate limit by API Key if authenticated, fallback to IP
    return req.apiKeyId || req.ip;
  }
});

module.exports = {
  apiRateLimiter
};
