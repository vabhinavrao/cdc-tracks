#!/usr/bin/env bash

# backup.sh
# Performs a compressed daily PostgreSQL database backup and implements retention limits.

set -euo pipefail

BACKUP_DIR="/opt/ads/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

echo "=== Starting Database Backup ==="
mkdir -p "$BACKUP_DIR"

# Read DB configuration details from env if present, else fallback
POSTGRES_USER=$(docker compose exec -T eds-postgres printenv POSTGRES_USER || echo "eds_user")
POSTGRES_DB=$(docker compose exec -T eds-postgres printenv POSTGRES_DB || echo "erp_data")

# Run pg_dump within the postgres container and compress it on host
echo "Dumping database $POSTGRES_DB to $BACKUP_FILE..."
docker compose exec -T eds-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Set permissions
chmod 600 "$BACKUP_FILE"
echo "Backup saved successfully."

# Enforce 7-day retention
echo "Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +7 -delete

echo "=== Backup Complete ==="
