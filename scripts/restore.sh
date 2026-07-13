#!/usr/bin/env bash

# restore.sh
# Restores the PostgreSQL database from a compressed backup file.

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path_to_backup.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE not found."
  exit 1
fi

echo "=== Starting Database Restore ==="

POSTGRES_USER=$(docker compose exec -T eds-postgres printenv POSTGRES_USER || echo "eds_user")
POSTGRES_DB=$(docker compose exec -T eds-postgres printenv POSTGRES_DB || echo "erp_data")

# Confirm restoration
read -p "Are you sure you want to drop and restore the database $POSTGRES_DB? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore aborted by user."
    exit 0
fi

echo "Recreating schema 'public' to ensure clean restore..."
docker compose exec -T eds-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $POSTGRES_USER;"

echo "Restoring database dump from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T eds-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "=== Database Restore Complete ==="
