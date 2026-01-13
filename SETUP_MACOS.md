# Hướng dẫn Setup và Chạy trên macOS

## Yêu cầu

1. **Homebrew** (nếu chưa có):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. **Docker Desktop for Mac**:
```bash
# Download từ: https://www.docker.com/products/docker-desktop
# Hoặc cài qua Homebrew:
brew install --cask docker
```

3. **Node.js 18+**:
```bash
brew install node@18
```

4. **Go 1.21+** (cho development gateway):
```bash
brew install go
```

## Bước 1: Clone và Setup Project

```bash
cd /Users/macbookpro/Gulagi/kd-outsource/Proxy96
```

## Bước 2: Tạo File Môi Trường

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa .env với các giá trị phù hợp
nano .env  # hoặc dùng editor khác
```

**Lưu ý**: Đổi các giá trị mặc định:
- `JWT_SECRET` - secret key mạnh cho JWT
- `POSTGRES_PASSWORD` - password cho PostgreSQL
- `REDIS_PASSWORD` - password cho Redis

## Bước 3: Tạo TLS Certificates

```bash
# Tạo thư mục certs
mkdir -p gateway/certs

# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout gateway/certs/key.pem \
  -out gateway/certs/cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

## Bước 4: Chạy Services với Docker

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Xem logs của từng service
docker-compose logs -f backend
docker-compose logs -f gateway
```

## Bước 5: Setup Database

```bash
# Vào container backend
docker-compose exec backend sh

# Trong container, chạy migrations
npm run migration:run

# Seed data mẫu (optional)
npm run seed

# Thoát container
exit
```

## Bước 6: Kiểm tra Services

- **Backend API**: http://localhost:3300
- **Gateway**: localhost:8080 (TLS)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

Test Backend API:
```bash
curl http://localhost:3300/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## Bước 7: Development Mode (Optional)

### Backend Development

```bash
cd backend
npm install
npm run start:dev
```

### Gateway Development

```bash
cd gateway
go mod download
go run main.go
```

## Bước 8: Build và Chạy Client

### Development Mode

```bash
cd client
npm install

# Terminal 1: Build main process
npm run dev:main

# Terminal 2: Build renderer (Vite dev server)
npm run dev:renderer

# Terminal 3: Start Electron
npm start
```

### Production Build (Windows)

```bash
cd client
npm install
npm run build
npm run build:win
```

File `.exe` sẽ được tạo trong `client/dist/`

## Troubleshooting

### Port đã được sử dụng

```bash
# Kiểm tra port đang dùng
lsof -i :3300
lsof -i :8080
lsof -i :5432
lsof -i :6379

# Kill process nếu cần
kill -9 <PID>
```

### Docker không chạy

```bash
# Start Docker Desktop
open -a Docker

# Kiểm tra Docker đang chạy
docker ps
```

### Database connection error

```bash
# Kiểm tra PostgreSQL container
docker-compose ps postgres

# Xem logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

### Redis connection error

```bash
# Kiểm tra Redis container
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli -a changeme ping
```

### Gateway TLS error

```bash
# Kiểm tra certificates
ls -la gateway/certs/

# Regenerate certificates nếu cần
rm gateway/certs/*
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout gateway/certs/key.pem \
  -out gateway/certs/cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

## Dừng Services

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (reset database)
docker-compose down -v
```

## Reset Hoàn Toàn

```bash
# Dừng và xóa tất cả
docker-compose down -v

# Xóa images
docker-compose rm -f

# Xóa volumes
docker volume rm Proxy96_postgres_data Proxy96_redis_data

# Build lại từ đầu
docker-compose build --no-cache
docker-compose up -d
```

## Cấu Hình Môi Trường

File `.env` mẫu:

```env
# Database
POSTGRES_USER=proxyadmin
POSTGRES_PASSWORD=changeme
POSTGRES_DB=Proxy96
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=changeme
REDIS_PORT=6379

# Backend
NODE_ENV=development
BACKEND_PORT=3300
JWT_SECRET=change-this-secret-key-in-production
JWT_EXPIRES_IN=7d

# Gateway
GATEWAY_PORT=8080
STICKY_TTL=900
HEALTH_CHECK_INTERVAL=45
```

## Lưu Ý cho macOS

1. **Docker Desktop**: Cần đảm bảo Docker Desktop đang chạy (icon Docker trong menu bar)

2. **Ports**: macOS có thể block một số ports, kiểm tra trong System Preferences > Security & Privacy

3. **File Permissions**: Đảm bảo có quyền đọc/ghi trong thư mục project

4. **Memory**: Docker Desktop cần ít nhất 4GB RAM, kiểm tra trong Docker Desktop > Settings > Resources

## Quick Start Script

Tạo file `start.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Proxy96 Platform..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
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
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "📦 Running database migrations..."
docker-compose exec -T backend npm run migration:run || true

echo "✅ Setup complete!"
echo ""
echo "Services:"
echo "  - Backend API: http://localhost:3000"
echo "  - Gateway: localhost:8080"
echo ""
echo "View logs: docker-compose logs -f"
```

Chạy:
```bash
chmod +x start.sh
./start.sh
```

