#!/usr/bin/env bash

# update.sh
# Performs zero/near-zero-downtime rolling updates of ADS.

set -euo pipefail

echo "=== Beginning Production Update ==="

# Check that we are inside the repository
cd /opt/ads/repo

# 1. Fetch latest changes
echo "Fetching latest version from local bare git remote..."
git pull origin main

# 2. Rebuild images
echo "Rebuilding Docker images in background..."
docker compose build

# 3. Apply container updates (recreate API and worker)
echo "Recreating containers gracefully..."
docker compose up -d --no-deps eds-api eds-worker

# 4. Execute Migrations
echo "Applying pending migrations..."
docker compose exec -T eds-api npm run db:migrate

# 5. Clean unused images
echo "Pruning dangling docker images..."
docker image prune -f

echo "=== Update Completed Gracefully ==="
