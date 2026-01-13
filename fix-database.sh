#!/bin/bash
set -e

echo "🔧 Fixing PostgreSQL database setup..."

# Detect docker-compose command
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  echo "❌ docker-compose not found"
  exit 1
fi

echo "📦 Stopping services..."
$DOCKER_COMPOSE down

echo "🗑️  Removing PostgreSQL volume..."
docker volume rm Proxy96_postgres_data 2>/dev/null || echo "Volume không tồn tại, tiếp tục..."

echo "🚀 Starting services..."
$DOCKER_COMPOSE up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be healthy
for i in {1..30}; do
  if docker exec Proxy96-postgres pg_isready -U proxyadmin > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  echo "⏳ Waiting for PostgreSQL... ($i/30)"
  sleep 1
done

echo "📦 Starting backend..."
$DOCKER_COMPOSE up -d backend

echo "⏳ Waiting for backend to be ready..."
sleep 5

echo "🔄 Running migrations..."
$DOCKER_COMPOSE exec -T backend npm run migration:run || echo "⚠️  Migration failed, but continuing..."

echo "🌱 Running seed..."
$DOCKER_COMPOSE exec -T backend npm run seed || echo "⚠️  Seed failed, but continuing..."

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Services:"
echo "  - Backend API: http://localhost:3300"
echo "  - Gateway: localhost:8080"
echo ""
echo "Tài khoản mặc định:"
echo "  - Email: admin@example.com"
echo "  - Password: admin123"
echo ""

