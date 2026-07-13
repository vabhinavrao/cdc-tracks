'use strict';

const crypto = require('crypto');
const db = require('../db/pool');
const logger = require('../utils/logger');

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  let apiKey = '';

  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.slice(7).trim();
  } else if (req.headers['x-api-key']) {
    apiKey = String(req.headers['x-api-key']).trim();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      code: 'API_KEY_REQUIRED',
      message: 'Authentication required: provide an API key in Authorization header or X-API-Key header'
    });
  }

  const prefix = apiKey.substring(0, 8);
  const hash = hashKey(apiKey);

  try {
    const { rows } = await db.query(
      `SELECT ak.id AS key_id, ak.client_id, ak.scopes, ac.status AS client_status
       FROM api_keys ak
       JOIN api_clients ac ON ak.client_id = ac.id
       WHERE ak.key_hash = $1 AND ak.key_prefix = $2
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
         AND ak.revoked_at IS NULL`,
      [hash, prefix]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_INVALID',
        message: 'Invalid, expired, or revoked API key'
      });
    }

    const keyRow = rows[0];

    if (keyRow.client_status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'CLIENT_SUSPENDED',
        message: 'The API client associated with this key is suspended or revoked'
      });
    }

    // Attach authentication context to the request.
    req.apiKeyId = keyRow.key_id;
    req.clientId = keyRow.client_id;
    req.scopes = keyRow.scopes || [];

    // Asynchronously update the last_used_at timestamp.
    db.query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [keyRow.key_id]
    ).catch((err) => {
      logger.warn({ err: err.message, keyId: keyRow.key_id }, 'Failed to update API key last_used_at');
    });

    return next();
  } catch (err) {
    logger.error({ err: err.message }, 'API key auth database lookup failed');
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Internal authorization error'
    });
  }
}

// Scoped gating middleware
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.scopes || !req.scopes.includes(scope)) {
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_SCOPE',
        message: `This action requires the "${scope}" scope`
      });
    }
    next();
  };
}

module.exports = {
  apiKeyAuth,
  requireScope
};
