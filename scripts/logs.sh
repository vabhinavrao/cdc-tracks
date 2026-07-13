#!/usr/bin/env bash

# logs.sh
# Standard wrapper to query and tail container logs.

set -euo pipefail

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
  echo "Tailing all services. Press Ctrl+C to exit."
  docker compose logs -f
else
  echo "Tailing service: $SERVICE. Press Ctrl+C to exit."
  docker compose logs -f "$SERVICE"
fi
