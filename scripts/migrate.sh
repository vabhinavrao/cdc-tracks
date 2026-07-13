#!/usr/bin/env bash

# migrate.sh
# Runs pending database migrations inside the active eds-api container.

set -euo pipefail

echo "=== Running Database Migrations ==="
docker compose exec -T eds-api npm run db:migrate
echo "=== Migrations Complete ==="
