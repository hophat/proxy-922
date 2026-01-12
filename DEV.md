# Development Guide

## Chạy Gateway trực tiếp (không dùng Docker)

Để giảm thời gian build và tăng tốc độ development, bạn có thể chạy gateway trực tiếp:

### 1. Chạy các services cần thiết trong Docker

```bash
# Chỉ chạy postgres, redis, và backend
docker compose up postgres redis backend
```

### 2. Chạy Gateway trực tiếp

```bash
# Option 1: Sử dụng script
./dev-gateway.sh

# Option 2: Chạy trực tiếp
cd gateway
./dev.sh
```

### 3. Cấu hình

Gateway sẽ tự động:
- Load environment variables từ `.env` file
- Tạo self-signed certificates nếu chưa có
- Kết nối đến backend và redis đang chạy trong Docker

### Environment Variables

Tạo file `.env` ở root project với:

```env
GATEWAY_PORT=8080
BACKEND_API_URL=http://localhost:3300
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=changeme
TLS_CERT_PATH=./gateway/certs/cert.pem
TLS_KEY_PATH=./gateway/certs/key.pem
STICKY_TTL=900
HEALTH_CHECK_INTERVAL=45
```

### Lợi ích

- ✅ Không cần build Docker image (tiết kiệm thời gian)
- ✅ Hot reload với `go run` (tự động rebuild khi code thay đổi)
- ✅ Debug dễ dàng hơn
- ✅ Logs trực tiếp trong terminal

### Lưu ý

- Cần có Go 1.21+ installed
- Cần có OpenSSL để generate certificates (hoặc tạo thủ công)
- Backend và Redis phải đang chạy trong Docker

