'use strict';

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

// Mock client and registration services
jest.mock('../src/services/credentialService', () => {
  return {
    registerStudent: jest.fn().mockResolvedValue({
      studentId: 'student-uuid-1',
      rollNumber: '25E51A05V0',
      name: 'TEST STUDENT',
      branch: 'CSE',
      syncJobs: { attendance: 'job-1', marks: 'job-2' }
    }),
    CredentialError: class CredentialError extends Error {
      constructor(message, statusCode) {
        super(message);
        this.name = 'CredentialError';
        this.statusCode = statusCode;
      }
    }
  };
});

jest.mock('../src/services/refreshService', () => {
  return {
    enqueueInitialSync: jest.fn().mockResolvedValue({
      attendance: 'job-1',
      marks: 'job-2'
    }),
    enqueueRefresh: jest.fn().mockResolvedValue('job-1')
  };
});

describe('Clients Integration Router Endpoint Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /v1/clients/:client_id/students/:roll/academic-summary', () => {
    test('Should return registered: false if student is not in database', async () => {
      // Mock API Key authorization success
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['read'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({ rows: [] }); // Student not found
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/v1/clients/cdc/students/25E51A05V0/academic-summary')
        .set('X-API-Key', 'eds_validkey');

      expect(res.statusCode).toBe(200);
      expect(res.body.registered).toBe(false);
      expect(res.body.data).toBeNull();
    });

    test('Should return completed status and cached records if sync successfully completed', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['read'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({
            rows: [{ id: 'student-uuid-1', roll_number: '25E51A05V0', name: 'TEST STUDENT', branch: 'CSE', status: 'active', last_success_at: '2026-07-12' }]
          });
        }
        if (text.includes('scrape_jobs')) {
          return Promise.resolve({ rows: [] }); // No active running jobs
        }
        if (text.includes('sync_status')) {
          return Promise.resolve({
            rows: [{ profile_at: '2026-07-12', attendance_at: '2026-07-12', marks_at: '2026-07-12', last_error_code: null }]
          });
        }
        if (text.includes('attendance_cache')) {
          return Promise.resolve({
            rows: [{ overall_percentage: 84.45, held: 380, attended: 321, scraped_at: '2026-07-12', subjects: [] }]
          });
        }
        if (text.includes('marks')) {
          return Promise.resolve({
            rows: [{ exam_id: 'sem1', exam_label: 'Regular', payload: {}, scraped_at: '2026-07-12' }]
          });
        }
        if (text.includes('student_spf_bands')) {
          return Promise.resolve({
            rows: [{ semester_label: 'I-I', cycle: 1, band: 'A', academic_year: 1, semester: 1 }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/v1/clients/cdc/students/25E51A05V0/academic-summary')
        .set('X-API-Key', 'eds_validkey');

      expect(res.statusCode).toBe(200);
      expect(res.body.registered).toBe(true);
      expect(res.body.syncStatus).toBe('completed');
      expect(res.body.data.attendance.overallPercentage).toBe(84.45);
    });

    test('Should return invalid credentials status if student credential status is set to invalid', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['read'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({
            rows: [{ id: 'student-uuid-1', roll_number: '25E51A05V0', name: 'TEST STUDENT', branch: 'CSE', status: 'invalid_credentials', last_success_at: '2026-07-11' }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/v1/clients/cdc/students/25E51A05V0/academic-summary')
        .set('X-API-Key', 'eds_validkey');

      expect(res.statusCode).toBe(200);
      expect(res.body.registered).toBe(true);
      expect(res.body.syncStatus).toBe('failed');
      expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /v1/clients/:client_id/students/:roll/register', () => {
    test('Should register and return provisioning status', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['register'], client_status: 'active' }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/v1/clients/cdc/students/25E51A05V0/register')
        .set('X-API-Key', 'eds_validkey')
        .send({ password: 'securePassword123' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('provisioning');
    });
  });

  describe('POST /v1/clients/:client_id/students/:roll/refresh', () => {
    test('Should trigger refresh sync jobs', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['refresh'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({
            rows: [{ id: 'student-uuid-1', roll_number: '25E51A05V0', status: 'active' }]
          });
        }
        if (text.includes('scrape_jobs')) {
          return Promise.resolve({ rows: [] }); // No current active jobs running in last 15 min
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/v1/clients/cdc/students/25E51A05V0/refresh')
        .set('X-API-Key', 'eds_validkey');

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Manual refresh sync jobs enqueued');
    });

    test('Should coalesce request if sync is already running in last 15 minutes', async () => {
      db.query.mockImplementation((text, params) => {
        if (text.includes('api_keys')) {
          return Promise.resolve({
            rows: [{ id: 'key-uuid-1', client_id: 'client-uuid-1', scopes: ['refresh'], client_status: 'active' }]
          });
        }
        if (text.includes('students')) {
          return Promise.resolve({
            rows: [{ id: 'student-uuid-1', roll_number: '25E51A05V0', status: 'active' }]
          });
        }
        if (text.includes('scrape_jobs')) {
          return Promise.resolve({
            rows: [{ id: 'job-uuid-active' }] // Active job exists!
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/v1/clients/cdc/students/25E51A05V0/refresh')
        .set('X-API-Key', 'eds_validkey');

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Sync is already active. Refresh request coalesced.');
    });
  });
});
