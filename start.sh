#!/bin/bash
set -e

echo "🚀 Starting Proxy96 Platform..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Detect docker-compose command
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  echo "❌ docker-compose not found. Please install Docker Compose."
  exit 1
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    # Create .env from template
    cat > .env << EOF
# Database Configuration
POSTGRES_USER=proxyadmin
POSTGRES_PASSWORD=changeme
POSTGRES_DB=Proxy96
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PASSWORD=changeme
REDIS_PORT=6379

# Backend API Configuration
NODE_ENV=development
BACKEND_PORT=3300
JWT_SECRET=change-this-secret-key-in-production
JWT_EXPIRES_IN=7d

# Gateway Configuration
GATEWAY_PORT=8080
STICKY_TTL=900
HEALTH_CHECK_INTERVAL=45

# Rotating Proxy Configuration
ROTATING_PROXY_DOMAIN=proxy.yourdomain.com
EOF
  fi
  echo "⚠️  Please edit .env file with your settings"
fi

# Create certificates if not exists
if [ ! -f gateway/certs/cert.pem ]; then
  echo "🔐 Generating TLS certificates..."
  mkdir -p gateway/certs
  openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout gateway/certs/key.pem \
    -out gateway/certs/cert.pem \
    -days 365 \
    -subj "/CN=localhost" 2>/dev/null
fi

# Start services
echo "🐳 Starting Docker services..."
$DOCKER_COMPOSE up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "📦 Running database migrations..."
$DOCKER_COMPOSE exec -T backend npm run migration:run || true

echo "✅ Setup complete!"
echo ""
echo "Services:"
echo "  - Backend API: http://localhost:3300"
echo "  - Gateway: localhost:8080"
echo ""
echo "View logs: $DOCKER_COMPOSE logs -f"

