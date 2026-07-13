'use strict';

// Set test environment variables before anything else loads
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://eds_user:eds_password@localhost:5433/erp_data_test';
process.env.REDIS_URL = 'redis://localhost:6380/0';
process.env.REDIS_PREFIX = 'eds:';
process.env.BULLMQ_PREFIX = 'eds';
process.env.EDS_ENCRYPTION_KEY = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
process.env.EDS_JWT_SECRET = 'supersecretjwtkeymustbe32charslong';
process.env.EDS_ADMIN_API_KEY = 'default_admin_api_key_value';

const request = require('supertest');
const app = require('../src/api');
const db = require('../src/db/pool');
const redis = require('../src/utils/redis');
const crypto = require('../src/utils/crypto');

// Mock PG Pool queries and Redis
jest.mock('../src/db/pool', () => {
  return {
    query: jest.fn(),
    getClient: jest.fn(),
    end: jest.fn()
  };
});

jest.mock('../src/utils/redis', () => {
  const mockClient = {
    ping: jest.fn().mockResolvedValue('PONG'),
    incr: jest.fn(),
    decr: jest.fn()
  };
  return {
    getClient: () => mockClient,
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setNx: jest.fn(),
    disconnect: jest.fn(),
    PREFIX: 'eds:'
  };
});

describe('College ERP Data Service (EDS) API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated Routes', () => {
    test('GET /health - Liveness check', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    test('GET /health/ready - Readiness check when postgres/redis are healthy', async () => {
      db.query.mockResolvedValue({ rows: [[1]] });
      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks.db).toBe(true);
      expect(res.body.checks.redis).toBe(true);
    });

    test('GET /health/ready - Readiness fails if postgres fails', async () => {
      db.query.mockRejectedValue(new Error('PG Connection refused'));
      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.checks.db).toBe(false);
      expect(res.body.checks.redis).toBe(true);
    });

    test('GET /metrics - Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('process_cpu_user_seconds_total');
    });
  });

  describe('API Key Authentication & Scope checks', () => {
    test('GET /v1/students/25E51A05V0/profile - Refused if API Key is missing', async () => {
      const res = await request(app).get('/v1/students/25E51A05V0/profile');
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('API_KEY_REQUIRED');
    });

    test('GET /v1/students/25E51A05V0/profile - Refused if API Key is invalid', async () => {
      db.query.mockResolvedValue({ rows: [] }); // Key not found in DB
      const res = await request(app)
        .get('/v1/students/25E51A05V0/profile')
        .set('Authorization', 'Bearer eds_invalidkey');
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('API_KEY_INVALID');
    });

    test('GET /v1/students/25E51A05V0/profile - Access granted if API Key is active and has correct scopes', async () => {
      // Robust mock implementation by query match to prevent async race condition consumption
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['read'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({
            rows: [{ id: 'student-uuid-1', roll_number: '25E51A05V0', name: 'TEST STUDENT', branch: 'CSE', program: 'B.Tech', status: 'active' }]
          });
        }
        if (text.includes('sync_status')) {
          return Promise.resolve({
            rows: [{ profile_at: null, attendance_at: null }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/v1/students/25E51A05V0/profile')
        .set('X-API-Key', 'eds_validkey_with_scope_read');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('TEST STUDENT');
    });

    test('GET /v1/students/25E51A05V0/profile - Forbidden if key client is suspended', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ key_id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['read'], client_status: 'suspended' }]
      });

      const res = await request(app)
        .get('/v1/students/25E51A05V0/profile')
        .set('Authorization', 'Bearer eds_suspendedkey');

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('CLIENT_SUSPENDED');
    });
  });

  describe('Password Cryptography Utilities', () => {
    test('Encrypt and decrypt roundtrip matches plaintext', () => {
      const plaintext = 'test-secret-password-123';
      const encrypted = crypto.encrypt(plaintext);
      expect(encrypted.startsWith('v1:')).toBe(true);
      
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
