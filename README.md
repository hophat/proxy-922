# MVP Proxy Platform

Hệ thống proxy platform với Windows Client, Proxy Gateway, và Backend API. Hỗ trợ rotate/sticky session, quota management, và health check SOCKS5 pool.

## Kiến trúc

```
User App
  → Gateway (TLS + Token Authentication)
  → SOCKS5 Pool
  → Target Website
```

**Lưu ý**: Hệ thống đã được đơn giản hóa - không còn local proxy server trên client. Client kết nối trực tiếp đến Gateway.

## Yêu cầu

- Docker & Docker Compose
- Node.js 18+ (cho development backend)
- Go 1.21+ (cho development gateway)
- PostgreSQL 15+
- Redis 7+

## Setup

**📱 Cho macOS**: Xem file [SETUP_MACOS.md](SETUP_MACOS.md) để có hướng dẫn chi tiết.

### 1. Clone và cấu hình môi trường

```bash
# Copy file môi trường
cp .env.example .env

# Chỉnh sửa .env với các giá trị phù hợp
# Đặc biệt: JWT_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD
```

### 2. Tạo TLS certificates cho Gateway

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

**Lưu ý:** Cho production, sử dụng certificates từ CA hợp lệ.

### 3. Chạy services với Docker Compose

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop và xóa volumes (reset database)
docker-compose down -v
```

### 4. Setup database (chạy migrations)

```bash
# Vào container backend
docker-compose exec backend sh

# Chạy migrations
npm run migration:run

# Seed data mẫu (optional)
npm run seed
```

### 5. Kiểm tra services

- **Backend API**: http://localhost:3300
- **Gateway**: localhost:8080 (TLS)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 6. Tài khoản đăng nhập

Sau khi chạy seed data, tài khoản mặc định được tạo:

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Quota**: 100GB

**Lưu ý**: Đây là tài khoản mẫu cho development. Trong production, hãy đổi mật khẩu hoặc tạo tài khoản mới.

**Test đăng nhập**:
```bash
curl http://localhost:3300/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## Development

### Backend API (NestJS)

**Lưu ý quan trọng:** Nếu bạn chạy backend local (không trong container), cần đảm bảo:
- PostgreSQL container đang chạy hoặc PostgreSQL local có user `proxyadmin`
- Set biến môi trường đúng (xem phần Troubleshooting nếu gặp lỗi "role does not exist")

**Cách 1: Chạy trong container (khuyến nghị)**
```bash
# Backend đã tự động chạy trong container
docker-compose up -d backend

# Xem logs
docker-compose logs -f backend
```

**Cách 2: Chạy local (development)**
```bash
cd backend
npm install

# Đảm bảo PostgreSQL container đang chạy
docker-compose up -d postgres

# Set biến môi trường
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USER=proxyadmin
export DATABASE_PASSWORD=changeme
export DATABASE_NAME=proxy992

# Hoặc tạo file .env trong backend/
npm run start:dev
```

### Gateway (Go)

```bash
cd gateway
go mod download
go run main.go
```

### Client (Electron)

```bash
cd client
npm install
npm run dev
```

## Cấu trúc Project

```
proxy992/
├── gateway/          # Go Proxy Gateway
├── backend/          # NestJS Backend API
├── client/           # Electron Windows Client
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/login` - Đăng nhập, nhận token
- `GET /auth/check-token` - Validate token

### Proxies
- `GET /proxies` - List proxies
- `POST /proxies` - Thêm proxy
- `POST /proxies/import` - Import từ file
- `PUT /proxies/:id` - Update proxy
- `DELETE /proxies/:id` - Xóa proxy

### Usage
- `POST /usage` - Log traffic usage
- `GET /users/:id/quota` - Check quota

## Windows Client

1. Build client:
```bash
cd client
npm run build:win
```

2. Installer sẽ được tạo trong `client/dist/`

3. Chạy client và đăng nhập với credentials

4. Click "Connect to Gateway" để kích hoạt kết nối Gateway

**Lưu ý**: Client không tạo local proxy server nữa. Kết nối được quản lý trực tiếp bởi Gateway. Xem [GATEWAY_USAGE.md](GATEWAY_USAGE.md) để biết cách kết nối từ ứng dụng của bạn.

## Testing

```bash
# Backend tests
cd backend
npm test

# Gateway tests
cd gateway
go test ./...

# Integration tests
npm run test:integration
```

## Security Notes

- **Development**: Sử dụng self-signed certificates
- **Production**: Phải sử dụng certificates từ CA hợp lệ
- Đổi tất cả default passwords trong `.env`
- Enable rate limiting và firewall rules
- Không log sensitive data (URLs, payloads)

## Troubleshooting

### Gateway không kết nối được
- Kiểm tra TLS certificates trong `gateway/certs/`
- Kiểm tra `BACKEND_API_URL` trong `.env`

### Database connection error

#### Lỗi "role 'proxyadmin' does not exist"

Lỗi này xảy ra khi:
- Backend chạy local (không trong container) và cố kết nối đến PostgreSQL local thay vì container
- PostgreSQL volume đã tồn tại từ lần chạy trước với user khác
- Database chưa được khởi tạo đúng

**Giải pháp:**

1. **Nếu backend chạy local (development mode) và có PostgreSQL local:**

   **Vấn đề:** PostgreSQL local đang chạy trên port 5432, backend local sẽ kết nối đến đó thay vì container.
   
   **Giải pháp A - Dừng PostgreSQL local (khuyến nghị):**
   ```bash
   # Tìm và dừng PostgreSQL local
   brew services stop postgresql@15
   # hoặc
   brew services stop postgresql
   # hoặc
   sudo launchctl unload /Library/LaunchDaemons/com.edb.launchd.postgresql-*.plist
   ```
   
   **Giải pháp B - Thay đổi port của container:**
   ```bash
   # Trong docker-compose.yml, đổi POSTGRES_PORT thành 5433
   # Trong .env: POSTGRES_PORT=5433
   # Khi chạy backend local, set DATABASE_PORT=5433
   ```
   
   **Giải pháp C - Tạo user trong PostgreSQL local:**
   ```bash
   # Kết nối đến PostgreSQL local
   psql -U postgres
   
   # Tạo user và database
   CREATE USER proxyadmin WITH PASSWORD 'changeme';
   CREATE DATABASE proxy992 OWNER proxyadmin;
   GRANT ALL PRIVILEGES ON DATABASE proxy992 TO proxyadmin;
   \q
   ```
   
   **Giải pháp D - Chạy backend trong container (khuyến nghị):**
   ```bash
   # Chỉ cần chạy backend trong container
   docker-compose up -d backend
   # Backend sẽ tự động kết nối đến postgres container
   ```

2. **Reset database (xóa volume và tạo lại):**
   ```bash
   # Chạy script fix tự động
   ./fix-database.sh
   
   # Hoặc thủ công:
   docker-compose down
   docker volume rm proxy992_postgres_data
   docker-compose up -d
   ```

3. **Tạo user thủ công trong PostgreSQL container:**
   ```bash
   # Vào PostgreSQL container
   docker exec -it proxy992-postgres psql -U proxyadmin -d proxy992
   
   # Kiểm tra user đã tồn tại
   \du
   ```

4. **Kiểm tra cấu hình:**
   - Đảm bảo PostgreSQL đã start và healthy: `docker-compose ps postgres`
   - Kiểm tra credentials trong `.env` khớp với docker-compose
   - Xem logs: `docker-compose logs postgres`
   - Test kết nối: `docker exec proxy992-postgres psql -U proxyadmin -d proxy992 -c "SELECT 1;"`

#### Các lỗi database khác
- Đảm bảo PostgreSQL đã start và healthy
- Kiểm tra credentials trong `.env` khớp với cấu hình
- Kiểm tra network connectivity giữa backend và postgres

### Redis connection error
- Đảm bảo Redis đã start và healthy
- Kiểm tra `REDIS_PASSWORD` trong `.env`

### Backend "Cannot find module" errors

Lỗi này có thể xảy ra khi:
- Backend cố chạy production mode nhưng code chưa được build
- Dependencies chưa được cài đặt đúng (ví dụ: `@nestjs/config`)

**Giải pháp:**

1. **Cài đặt lại dependencies:**
   ```bash
   # Vào container backend
   docker-compose exec backend sh
   
   # Cài đặt dependencies
   npm install
   
   # Hoặc từ bên ngoài
   docker-compose exec backend npm install
   ```

2. **Rebuild container (sau khi sửa Dockerfile):**
   ```bash
   # Rebuild backend container
   docker-compose build backend
   
   # Restart backend
   docker-compose restart backend
   
   # Hoặc rebuild và start lại tất cả
   docker-compose down
   docker-compose up -d --build
   ```

3. **Lỗi "SyntaxError: Unexpected string" khi chạy entrypoint.sh:**
   - Lỗi này xảy ra khi CMD trong Dockerfile không chỉ định shell
   - Đã được sửa trong Dockerfile: `CMD ["/bin/sh", "/app/entrypoint.sh"]`
   - Cần rebuild container: `docker-compose build backend && docker-compose up -d`

3. **Trong Development mode (mặc định):**
   - Backend sẽ tự động chạy `start:dev` với watch mode
   - Entrypoint script sẽ tự động cài dependencies nếu thiếu
   - Không cần build, code sẽ được compile tự động

4. **Kiểm tra NODE_ENV:**
   ```bash
   # Đảm bảo NODE_ENV=development trong .env hoặc docker-compose
   # Nếu muốn chạy production, set NODE_ENV=production
   ```

5. **Build thủ công nếu cần:**
   ```bash
   # Vào container
   docker-compose exec backend sh
   
   # Đảm bảo dependencies đã được cài
   npm install
   
   # Build code
   npm run build
   ```

6. **Kiểm tra logs để xem lỗi chi tiết:**
   ```bash
   docker-compose logs backend
   ```

### Client không đăng nhập được

1. **Kiểm tra Backend API đã chạy:**
   ```bash
   # Kiểm tra backend container
   docker-compose ps backend
   
   # Xem logs backend
   docker-compose logs backend
   
   # Test API trực tiếp
   curl http://localhost:3300/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
   ```

2. **Kiểm tra đã chạy seed data:**
   ```bash
   # Vào container backend
   docker-compose exec backend sh
   
   # Chạy seed
   npm run seed
   ```

3. **Kiểm tra database có user:**
   ```bash
   # Vào PostgreSQL
   docker-compose exec postgres psql -U proxyadmin -d proxy992
   
   # Kiểm tra users
   SELECT email, active FROM users;
   ```

4. **Kiểm tra CORS và network:**
   - Đảm bảo backend đang chạy tại `http://localhost:3300`
   - Kiểm tra firewall không chặn port 3300
   - Xem console logs trong Electron DevTools để xem lỗi chi tiết

5. **Reset và setup lại:**
   ```bash
   # Dừng và xóa volumes
   docker-compose down -v
   
   # Start lại
   docker-compose up -d
   
   # Chạy migrations và seed
   docker-compose exec backend npm run migration:run
   docker-compose exec backend npm run seed
   ```

## License

Private - Internal use only

