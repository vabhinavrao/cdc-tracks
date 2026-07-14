# CDC Tracks - Academic Scraper Service (FastAPI)

A lightweight, stateless Python FastAPI service designed to run on a **Render Free Instance (512 MB RAM)**. It replaces the legacy multi-container Node/Docker/Redis/BullMQ setup with a single synchronous process, fetching JNTU academic records in a single login session.

## Features
- **Stateless & Synchronous**: All JNTU crawls run synchronously within the client request cycle. No background tasks or message queues.
- **Single Session Login**: Logs in exactly once to JNTU ERP to fetch profile, attendance, internal/external marks, SGPA/CGPA, and SPF bands sequentially.
- **AES-256-GCM Node Compatibility**: Decrypts and encrypts stored passwords using versioned formatting (`v1:iv:tag:ct`) compatible with legacy database records.
- **Neon Connection Pool**: Conservative SQLAlchemy connection pooling constraints (`pool_size=5`, `max_overflow=2`) to fit Neon limits.
- **Robust Retry & Timing Metrics**: Custom transient error retry logic (max 2 attempts) and timings logging.

---

## Local Setup

### 1. Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file at the root or set in your shell:
- `DATABASE_URL`: Connection string for Neon PostgreSQL database.
- `ADS_API_KEY`: Client authorization key (e.g. `cdc_api_key_for_local_testing_54321`).
- `EDS_ENCRYPTION_KEY`: 32-byte hex credentials encryption key.
- `EDS_ENCRYPTION_KEY_VERSION`: Key version (default: `1`).

### 3. Run the Server
```bash
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 3101 --reload
```

---

## Endpoint API

### Legacy Gateway Compatibility
- `GET /v1/clients/:client_id/students/:roll/academic-summary`: Fetches cached academic details from Neon.
- `POST /v1/clients/:client_id/students/:roll/register`: Registers a student credentials, performs live validation, scrapes and caches details.
- `POST /v1/clients/:client_id/students/:roll/refresh`: Synchronously scrapes, normalizes, caches latest details and returns 202 status.

### REST Clean Aliases
- `POST /connect`: Link and validate credentials.
- `POST /refresh?roll=...`: Synchronously refresh credentials cache.
- `GET /academic?roll=...`: Retrieve cached details.

---

## Testing
Run pytest suite:
```bash
source venv/bin/activate
python3 -m pytest -v
```
