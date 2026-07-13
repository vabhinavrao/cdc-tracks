-- 001_init.sql
-- Standalone ERP Data Service schema initialization.
-- Target DB: erp_data / erp_data_test

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE api_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  daily_quota     INTEGER NOT NULL DEFAULT 10000,
  rpm_limit       INTEGER NOT NULL DEFAULT 60,
  scrape_quota_day INTEGER NOT NULL DEFAULT 500,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  key_prefix      TEXT NOT NULL,              -- First 8 chars of plain key
  key_hash        TEXT NOT NULL,              -- SHA-256 hex hash of the full key
  scopes          TEXT[] NOT NULL DEFAULT ARRAY['read', 'register', 'refresh'],
  expires_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id      TEXT NOT NULL DEFAULT 'hitam',
  roll_number     TEXT NOT NULL,
  name            TEXT,
  branch          TEXT,
  program         TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invalid_credentials', 'disabled')),
  first_scraped_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (college_id, roll_number)
);

CREATE TABLE erp_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  roll_number     TEXT NOT NULL,              -- Denormalized for worker lookup
  college_id      TEXT NOT NULL DEFAULT 'hitam',
  password_enc    TEXT NOT NULL,              -- vN:iv:tag:ct format
  key_version     INTEGER NOT NULL DEFAULT 1,
  last_validated_at TIMESTAMPTZ,
  invalid_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_erp_credentials_roll ON erp_credentials(college_id, roll_number);

-- Attendance cache table (durable DB mirror)
CREATE TABLE attendance_cache (
  student_id      UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  term_label      TEXT,
  overall_percentage NUMERIC(5,2),
  held            INTEGER,
  attended        INTEGER,
  subjects        JSONB NOT NULL DEFAULT '[]',
  scraped_at      TIMESTAMPTZ NOT NULL,
  source_hash     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id         TEXT NOT NULL,
  exam_label      TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  scraped_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, exam_id)
);

CREATE TABLE semester_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_label  TEXT NOT NULL,
  academic_year   TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  scraped_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, semester_label)
);

CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_code    TEXT,
  subject_name    TEXT NOT NULL,
  meta            JSONB NOT NULL DEFAULT '{}',
  scraped_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_name)
);

CREATE TABLE backlogs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_name    TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  scraped_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_name)
);

CREATE TABLE internal_marks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_or_period  TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  scraped_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, exam_or_period)
);

CREATE TABLE student_spf_bands (
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_label  TEXT NOT NULL,
  cycle           INTEGER NOT NULL,
  band            TEXT NOT NULL,
  academic_year   INTEGER,
  semester        INTEGER,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, semester_label, cycle)
);

CREATE TABLE scrape_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  roll_number     TEXT NOT NULL,
  module          TEXT NOT NULL,
  bull_job_id     TEXT,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','active','completed','failed','dead','deduped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_error      TEXT,
  enqueued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  request_id      TEXT,
  client_id       UUID REFERENCES api_clients(id) ON DELETE SET NULL
);
CREATE INDEX idx_scrape_jobs_roll_module ON scrape_jobs(roll_number, module, status);
CREATE INDEX idx_scrape_jobs_enqueued ON scrape_jobs(enqueued_at DESC);

CREATE TABLE sync_status (
  student_id      UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  profile_at      TIMESTAMPTZ,
  attendance_at   TIMESTAMPTZ,
  marks_at        TIMESTAMPTZ,
  semester_at     TIMESTAMPTZ,
  internal_at     TIMESTAMPTZ,
  backlogs_at     TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_at   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  request_id      TEXT,
  client_id       UUID,
  api_key_id      UUID,
  method          TEXT NOT NULL,
  path            TEXT NOT NULL,
  roll_number     TEXT,
  status_code     INTEGER,
  duration_ms     INTEGER,
  ip_hash         TEXT,
  meta            JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_client ON audit_logs(client_id, created_at DESC);

COMMIT;
