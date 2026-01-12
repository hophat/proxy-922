#!/bin/bash
# Development script to run gateway directly without Docker

set -e

echo "🚀 Starting Gateway in development mode..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

# Load environment variables from .env if exists
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Set default values
export GATEWAY_PORT=${GATEWAY_PORT:-8080}
export BACKEND_API_URL=${BACKEND_API_URL:-http://localhost:3300}
export REDIS_HOST=${REDIS_HOST:-127.0.0.1}
export REDIS_PORT=${REDIS_PORT:-6380}
# Redis server password (có thể không có password)
export REDIS_PASSWORD=${REDIS_PASSWORD:-}

export TLS_CERT_PATH=${TLS_CERT_PATH:-./certs/cert.pem}
export TLS_KEY_PATH=${TLS_KEY_PATH:-./certs/key.pem}
export STICKY_TTL=${STICKY_TTL:-900}
export HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-45}

echo "📋 Configuration:"
echo "   GATEWAY_PORT: $GATEWAY_PORT"
echo "   BACKEND_API_URL: $BACKEND_API_URL"
echo "   REDIS_HOST: $REDIS_HOST:$REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    echo "   REDIS_PASSWORD: ***"
else
    echo "   REDIS_PASSWORD: (none)"
fi
echo "   TLS_CERT: $TLS_CERT_PATH"
echo ""

# Check if certs exist
if [ ! -f "$TLS_CERT_PATH" ] || [ ! -f "$TLS_KEY_PATH" ]; then
    echo "⚠️  TLS certificates not found. Generating self-signed certificates..."
    mkdir -p ./certs
    openssl req -x509 -newkey rsa:4096 -keyout "$TLS_KEY_PATH" -out "$TLS_CERT_PATH" \
        -days 365 -nodes -subj "/CN=localhost" 2>/dev/null || {
        echo "❌ Failed to generate certificates. Please install OpenSSL or create certificates manually."
        exit 1
    }
    echo "✅ Certificates generated"
fi

# Run gateway
echo "🏃 Running gateway..."
go run main.go

