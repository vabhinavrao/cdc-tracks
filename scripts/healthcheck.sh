#!/usr/bin/env bash

# healthcheck.sh
# Performs self-diagnostics on the system container status and application endpoints.

set -euo pipefail

echo "=== System Health Status ==="
echo "1. Container Status:"
docker compose ps

echo -e "\n2. API Liveness Probe (/health):"
curl -sS -f http://127.0.0.1:3101/health || echo "Error: Liveness check failed!"

echo -e "\n3. API Readiness Probe (/health/ready):"
curl -sS -f http://127.0.0.1:3101/health/ready || echo "Error: Readiness check failed!"

echo -e "\n4. Host Resource Audits:"
free -h
df -h /
