# Hướng dẫn Deploy Gateway

Tài liệu này hướng dẫn cách deploy Gateway service của Proxy992 Platform. Gateway là một service Go được viết để xử lý kết nối TLS từ clients và forward đến SOCKS5 proxy pool.

## Tổng quan

Gateway service có các đặc điểm:
- **Language**: Go 1.21+
- **Protocol**: TLS (TLS 1.2+)
- **Port mặc định**: 8080
- **Dependencies**: Backend API, Redis
- **Authentication**: JWT Token (qua Backend API)
- **Session Management**: Redis (sticky sessions)

## Prerequisites

- **Backend API**: Phải đang chạy và accessible
- **Redis**: Phải đang chạy và accessible
- **TLS Certificates**: Certificate và private key cho TLS connection
- **Network**: Port 8080 (hoặc port tùy chỉnh) phải mở

## Cách 1: Deploy với Docker (Khuyến nghị)

Đây là cách đơn giản và khuyến nghị nhất, đặc biệt khi deploy cùng với các services khác.

### 1.1. Deploy cùng với Docker Compose

Gateway được cấu hình sẵn trong `docker-compose.yml`. Để deploy:

```bash
# Từ root directory của project
docker compose up -d gateway
```

### 1.2. Cấu hình Environment Variables

Gateway sử dụng các environment variables sau (trong `.env` file):

```env
# Gateway Configuration
GATEWAY_PORT=8080
STICKY_TTL=900
HEALTH_CHECK_INTERVAL=45

# Redis Configuration (Gateway cần Redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Backend API URL (Gateway cần Backend API)
BACKEND_API_URL=http://backend:3300
```

**Lưu ý:** 
- Trong Docker Compose, `REDIS_HOST=redis` và `BACKEND_API_URL=http://backend:3300` (tên services)
- Khi deploy standalone, sử dụng IP/domain thực tế

### 1.3. Setup TLS Certificates

Gateway yêu cầu TLS certificates. Đặt certificates vào `gateway/certs/`:

```bash
# Tạo thư mục (nếu chưa có)
mkdir -p gateway/certs

# Copy certificates vào
cp /path/to/cert.pem gateway/certs/cert.pem
cp /path/to/key.pem gateway/certs/key.pem

# Đảm bảo permissions
chmod 644 gateway/certs/cert.pem
chmod 600 gateway/certs/key.pem
```

**Production:** Sử dụng Let's Encrypt hoặc certificates từ CA hợp lệ
**Development:** Có thể dùng self-signed certificate

Xem phần [TLS Certificates Setup](#tls-certificates-setup) để biết chi tiết.

### 1.4. Build Docker Image

```bash
# Build gateway image
docker compose build gateway

# Hoặc build từ thư mục gateway
cd gateway
docker build -t proxy992-gateway .
```

### 1.5. Start Gateway

```bash
# Start gateway (với docker-compose)
docker compose up -d gateway

# Xem logs
docker compose logs -f gateway

# Check status
docker compose ps gateway
```

### 1.6. Verify Deployment

```bash
# Test TLS connection
openssl s_client -connect localhost:8080 -servername your-domain.com

# Hoặc từ xa
openssl s_client -connect your-server-ip:8080

# Kiểm tra logs
docker compose logs gateway | tail -20
```

## Cách 2: Deploy Standalone (Binary)

Deploy Gateway như một standalone service (không dùng Docker).

### 2.1. Yêu cầu

- **Go 1.21+** (nếu build từ source)
- **Redis** đang chạy và accessible
- **Backend API** đang chạy và accessible
- **TLS Certificates**

### 2.2. Build Binary

#### Option A: Build trên server

```bash
# Clone repository
git clone <repository-url> proxy992
cd proxy992/gateway

# Build binary
go build -ldflags="-w -s" -o gateway main.go

# Binary sẽ được tạo tại: ./gateway
```

#### Option B: Cross-compile từ máy local

```bash
# Build cho Linux
GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o gateway-linux main.go

# Build cho macOS
GOOS=darwin GOARCH=amd64 go build -ldflags="-w -s" -o gateway-mac main.go

# Build cho Windows
GOOS=windows GOARCH=amd64 go build -ldflags="-w -s" -o gateway-windows.exe main.go
```

### 2.3. Copy Binary lên Server

```bash
# Copy binary
scp gateway user@server:/opt/proxy992-gateway/

# Hoặc upload qua FTP/SFTP
```

### 2.4. Setup Environment Variables

Tạo file `/opt/proxy992-gateway/.env` hoặc export environment variables:

```bash
export GATEWAY_PORT=8080
export BACKEND_API_URL=http://your-backend-api:3300
export REDIS_HOST=your-redis-host
export REDIS_PORT=6379
export REDIS_PASSWORD=your-redis-password
export TLS_CERT_PATH=/opt/proxy992-gateway/certs/cert.pem
export TLS_KEY_PATH=/opt/proxy992-gateway/certs/key.pem
export STICKY_TTL=900
export HEALTH_CHECK_INTERVAL=45
```

### 2.5. Setup TLS Certificates

```bash
# Tạo thư mục
mkdir -p /opt/proxy992-gateway/certs

# Copy certificates
cp /path/to/cert.pem /opt/proxy992-gateway/certs/cert.pem
cp /path/to/key.pem /opt/proxy992-gateway/certs/key.pem

# Set permissions
chmod 644 /opt/proxy992-gateway/certs/cert.pem
chmod 600 /opt/proxy992-gateway/certs/key.pem
chown gateway:gateway /opt/proxy992-gateway/certs/*.pem
```

### 2.6. Tạo Systemd Service (Linux)

Tạo file `/etc/systemd/system/proxy992-gateway.service`:

```ini
[Unit]
Description=Proxy992 Gateway Service
After=network.target redis.service

[Service]
Type=simple
User=gateway
Group=gateway
WorkingDirectory=/opt/proxy992-gateway
ExecStart=/opt/proxy992-gateway/gateway
Restart=always
RestartSec=10

# Environment variables
Environment="GATEWAY_PORT=8080"
Environment="BACKEND_API_URL=http://localhost:3300"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="REDIS_PASSWORD=your-redis-password"
Environment="TLS_CERT_PATH=/opt/proxy992-gateway/certs/cert.pem"
Environment="TLS_KEY_PATH=/opt/proxy992-gateway/certs/key.pem"
Environment="STICKY_TTL=900"
Environment="HEALTH_CHECK_INTERVAL=45"

# Security
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=proxy992-gateway

[Install]
WantedBy=multi-user.target
```

### 2.7. Start Service

```bash
# Tạo user (nếu chưa có)
sudo useradd -r -s /bin/false gateway

# Reload systemd
sudo systemctl daemon-reload

# Enable service (tự động start khi boot)
sudo systemctl enable proxy992-gateway

# Start service
sudo systemctl start proxy992-gateway

# Check status
sudo systemctl status proxy992-gateway

# Xem logs
sudo journalctl -u proxy992-gateway -f
```

### 2.8. Verify Deployment

```bash
# Test connection
openssl s_client -connect localhost:8080

# Check process
ps aux | grep gateway

# Check logs
sudo journalctl -u proxy992-gateway --since "10 minutes ago"
```

## TLS Certificates Setup

### Option 1: Let's Encrypt (Production)

```bash
# Cài đặt Certbot
sudo apt-get install certbot

# Tạo certificate (standalone mode)
sudo certbot certonly --standalone -d gateway.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/gateway.your-domain.com/fullchain.pem gateway/certs/cert.pem
sudo cp /etc/letsencrypt/live/gateway.your-domain.com/privkey.pem gateway/certs/key.pem
sudo chmod 644 gateway/certs/cert.pem
sudo chmod 600 gateway/certs/key.pem
```

### Option 2: Self-signed (Development/Testing)

```bash
# Tạo self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout gateway/certs/key.pem \
  -out gateway/certs/cert.pem \
  -days 365 \
  -subj "/CN=your-domain.com"

# Set permissions
chmod 644 gateway/certs/cert.pem
chmod 600 gateway/certs/key.pem
```

**Lưu ý:** Self-signed certificates sẽ gây cảnh báo trong clients. Chỉ dùng cho development/testing.

### Option 3: Commercial Certificate

Nếu có certificate từ CA (ví dụ: DigiCert, GlobalSign):

```bash
# Copy certificate và key
cp your-certificate.crt gateway/certs/cert.pem
cp your-private-key.key gateway/certs/key.pem

# Nếu có certificate chain, concatenate:
cat your-certificate.crt intermediate.crt root.crt > gateway/certs/cert.pem

# Set permissions
chmod 644 gateway/certs/cert.pem
chmod 600 gateway/certs/key.pem
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GATEWAY_PORT` | Port Gateway listen | `8080` | No |
| `BACKEND_API_URL` | URL của Backend API | `http://localhost:3300` | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | (empty) | Depends |
| `TLS_CERT_PATH` | Path to TLS certificate | `./certs/cert.pem` | Yes |
| `TLS_KEY_PATH` | Path to TLS private key | `./certs/key.pem` | Yes |
| `STICKY_TTL` | Sticky session TTL (seconds) | `900` | No |
| `HEALTH_CHECK_INTERVAL` | Health check interval (seconds) | `45` | No |

## Network Configuration

### Firewall Rules

Gateway cần mở port để accept connections:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 8080/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### Load Balancer (Nếu cần)

Nếu chạy multiple Gateway instances, có thể dùng load balancer:

```nginx
# Nginx configuration
stream {
    upstream gateway_backend {
        least_conn;
        server gateway1:8080;
        server gateway2:8080;
        server gateway3:8080;
    }

    server {
        listen 8080;
        proxy_pass gateway_backend;
        proxy_timeout 1s;
        proxy_responses 1;
    }
}
```

## Monitoring và Logging

### Docker Logs

```bash
# Xem logs real-time
docker compose logs -f gateway

# Xem last 100 lines
docker compose logs --tail=100 gateway

# Xem logs từ thời điểm cụ thể
docker compose logs --since "2024-01-01T00:00:00" gateway
```

### Systemd Logs

```bash
# Xem logs real-time
sudo journalctl -u proxy992-gateway -f

# Xem logs từ hôm nay
sudo journalctl -u proxy992-gateway --since today

# Xem logs với filter
sudo journalctl -u proxy992-gateway -p err
```

### Health Check

Gateway không có HTTP health check endpoint (vì là TLS service). Để check health:

```bash
# Test TLS connection
openssl s_client -connect localhost:8080 -quiet < /dev/null

# Hoặc dùng telnet (sẽ fail nhưng biết service đang listen)
telnet localhost 8080
```

## Troubleshooting

### Gateway không start

**Lỗi: "Failed to load TLS certificate"**

```bash
# Kiểm tra certificates tồn tại
ls -la gateway/certs/

# Kiểm tra permissions
chmod 644 gateway/certs/cert.pem
chmod 600 gateway/certs/key.pem

# Test certificate
openssl x509 -in gateway/certs/cert.pem -text -noout
openssl rsa -in gateway/certs/key.pem -check
```

**Lỗi: "Failed to start listener"**

```bash
# Kiểm tra port đã được sử dụng
sudo lsof -i :8080
sudo netstat -tulpn | grep 8080

# Kiểm tra firewall
sudo ufw status
```

### Gateway không kết nối được Backend/Redis

**Lỗi: "Connection refused" hoặc timeout**

```bash
# Test Backend API connection
curl http://your-backend-api:3300/health

# Test Redis connection
redis-cli -h your-redis-host -p 6379 -a your-password PING

# Kiểm tra network connectivity
telnet your-backend-api 3300
telnet your-redis-host 6379
```

### High CPU/Memory Usage

```bash
# Check resource usage
docker stats proxy992-gateway

# Hoặc với standalone
top -p $(pgrep gateway)
htop -p $(pgrep gateway)

# Check số lượng connections
netstat -an | grep :8080 | wc -l
```

### Connection Issues

```bash
# Check số lượng connections
ss -tan | grep :8080 | wc -l

# Check connections từ client
ss -tan | grep :8080 | grep ESTAB

# Monitor connections real-time
watch -n 1 'ss -tan | grep :8080 | wc -l'
```

## Updates và Maintenance

### Update Gateway (Docker)

```bash
# Pull latest code
git pull

# Rebuild image
docker compose build gateway

# Restart service
docker compose up -d --no-deps gateway
```

### Update Gateway (Standalone)

```bash
# Stop service
sudo systemctl stop proxy992-gateway

# Backup current binary
cp gateway gateway.backup

# Build new binary
go build -ldflags="-w -s" -o gateway main.go

# Start service
sudo systemctl start proxy992-gateway

# Verify
sudo systemctl status proxy992-gateway
```

### Restart Gateway

```bash
# Docker
docker compose restart gateway

# Systemd
sudo systemctl restart proxy992-gateway
```

## Performance Tuning

### Resource Limits (Docker)

Thêm vào `docker-compose.yml`:

```yaml
services:
  gateway:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### Systemd Limits

Thêm vào service file:

```ini
[Service]
LimitNOFILE=65535
LimitNPROC=4096
```

### TCP Tuning (System-level)

```bash
# Increase connection limits
echo "net.core.somaxconn = 4096" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 8192" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Security Best Practices

1. **Sử dụng strong TLS certificates** (Let's Encrypt hoặc CA hợp lệ)
2. **Restrict network access** (chỉ mở port 8080 cho clients)
3. **Monitor logs** để phát hiện bất thường
4. **Regular updates** (Go runtime, dependencies)
5. **Run với non-root user** (nếu standalone)
6. **Firewall rules** (chỉ allow IPs cần thiết nếu có thể)
7. **Rate limiting** (có thể setup ở load balancer level)

## Support

Nếu gặp vấn đề:
1. Check logs: `docker compose logs gateway` hoặc `journalctl -u proxy992-gateway`
2. Verify certificates và permissions
3. Test network connectivity (Backend API, Redis)
4. Check resource usage
5. Xem documentation trong repository
