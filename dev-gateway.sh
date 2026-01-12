#!/bin/bash
# Run gateway in dev mode (outside Docker) while other services run in Docker

set -e

echo "🚀 Starting Gateway in development mode (outside Docker)"
echo "📝 Make sure backend and redis are running in Docker first"
echo ""

cd gateway

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Override for local dev
export BACKEND_API_URL=${BACKEND_API_URL:-http://localhost:3300}
export REDIS_HOST=${REDIS_HOST:-127.0.0.1}
export REDIS_PORT=${REDIS_PORT:-6380}
# Redis server password (có thể không có password)
export REDIS_PASSWORD=${REDIS_PASSWORD:-}

./dev.sh

