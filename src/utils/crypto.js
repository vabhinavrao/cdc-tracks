'use strict';

const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes

function _getKey(version = config.crypto.encryptionKeyVersion) {
  const hex = config.crypto.encryptionKey;
  if (!hex || hex.length !== 64) {
    throw new Error(
      `EDS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
      `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns versioned format: "v<version>:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
function encrypt(plaintext) {
  const keyVersion = config.crypto.encryptionKeyVersion;
  const key = _getKey(keyVersion);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return `v${keyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a stored ciphertext.
 * Supports the versioned format: "v<version>:<iv>:<authTag>:<ct>"
 */
function decrypt(stored) {
  if (!stored || typeof stored !== 'string') {
    throw new Error('Invalid encrypted credential value');
  }

  try {
    if (!stored.startsWith('v')) {
      throw new Error('Invalid encrypted credential format (missing version prefix)');
    }

    const [ver, ivHex, authTagHex, ctHex] = stored.split(':');
    if (!ver || !ivHex || !authTagHex || !ctHex) {
      throw new Error('Malformed encrypted credential components');
    }

    const version = parseInt(ver.slice(1), 10);
    const key = _getKey(version);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ctHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error(`Credential decryption failed: ${err.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt
};
