#!/usr/bin/env bash

# generate-secrets.sh
# Generates secure high-entropy production secrets for ADS.

set -euo pipefail

ENV_FILE="${1:-.env}"

if [ -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE already exists. Skip generation."
  exit 0
fi

echo "Generating secure secrets in $ENV_FILE..."

# Generate keys
POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
EDS_ENCRYPTION_KEY=$(openssl rand -hex 32) # 64 hex characters
EDS_JWT_SECRET=$(openssl rand -hex 32) # 64 hex characters
EDS_ADMIN_API_KEY=$(openssl rand -hex 24)

cat <<EOF > "$ENV_FILE"
# Independent ERP Data Service Production Environment Variables

NODE_ENV=production
PORT=3101

# PostgreSQL
POSTGRES_DB=erp_data
POSTGRES_USER=eds_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# Isolation configurations (must match these exact values)
REDIS_KEY_PREFIX=eds:
BULLMQ_PREFIX=eds

# Master AES encryption key (64 hex characters / 32 bytes)
EDS_ENCRYPTION_KEY=$EDS_ENCRYPTION_KEY
EDS_ENCRYPTION_KEY_VERSION=1

# Secret used to sign administrative/internal tokens (min 32 characters)
EDS_JWT_SECRET=$EDS_JWT_SECRET

# API Key used by administrators to manage clients and reset circuit breakers
EDS_ADMIN_API_KEY=$EDS_ADMIN_API_KEY

# Scraper timing configurations
HTTP_TIMEOUT_MS=15000
LOGIN_TIMEOUT_MS=8000

# Concurrency and Queue throttle constraints
EDS_MAX_ERP_SESSIONS=2
EDS_MAX_CONCURRENT_JOBS=2
QUEUE_SOFT_LIMIT=50
QUEUE_HARD_LIMIT=100
EOF

chmod 600 "$ENV_FILE"
echo "Secrets successfully generated in $ENV_FILE with secure file permissions (600)."
