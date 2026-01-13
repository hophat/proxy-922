# Hướng dẫn Deploy Server Production

Tài liệu này hướng dẫn cách deploy Proxy96 Platform lên môi trường production.

## Prerequisites (Yêu cầu hệ thống)

- **Server**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ (hoặc Linux distribution hỗ trợ Docker)
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+ (hoặc docker-compose 1.29+)
- **Disk Space**: Tối thiểu 10GB (khuyến nghị 20GB+)
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB+)
- **CPU**: Tối thiểu 2 cores (khuyến nghị 4+ cores)
- **Domain name**: Để cấu hình TLS certificates (khuyến nghị)

## 1. Cài đặt Docker và Docker Compose

### Ubuntu/Debian

```bash
# Update system
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### CentOS/RHEL

```bash
# Install prerequisites
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

## 2. Clone Repository

```bash
# Clone repository
git clone <repository-url> Proxy96
cd Proxy96

# Hoặc nếu đã có code, upload lên server
```

## 3. Cấu hình Environment Variables

### Tạo file .env

```bash
# Copy từ template (nếu có)
cp .env.example .env

# Hoặc tạo file .env mới
nano .env
```

### Cấu hình .env cho Production

```env
# Database Configuration
POSTGRES_USER=proxyadmin
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_DB=Proxy96
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>
REDIS_PORT=6379

# Backend API Configuration
NODE_ENV=production
BACKEND_PORT=3300
JWT_SECRET=<GENERATE_STRONG_SECRET_KEY>
JWT_EXPIRES_IN=7d

# Gateway Configuration
GATEWAY_PORT=8080
STICKY_TTL=900
HEALTH_CHECK_INTERVAL=45

# Sepay Payment Configuration (nếu sử dụng)
SEPAY_API_URL=https://api.sepay.vn
SEPAY_API_KEY=<YOUR_SEPAY_API_KEY>
SEPAY_WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>
SEPAY_BANK_ACCOUNT=<YOUR_BANK_ACCOUNT>
SEPAY_BANK_NAME=Vietcombank
SEPAY_ACCOUNT_NAME=<YOUR_ACCOUNT_NAME>
```

### Tạo Strong Passwords/Secrets

```bash
# Generate random password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64
```

**Lưu ý quan trọng:**
- Đổi tất cả mật khẩu mặc định
- JWT_SECRET phải là chuỗi ngẫu nhiên mạnh (ít nhất 32 ký tự)
- Lưu các giá trị này ở nơi an toàn (password manager)

## 4. Setup TLS Certificates cho Gateway

### Option 1: Sử dụng Let's Encrypt (Khuyến nghị cho Production)

```bash
# Cài đặt Certbot
sudo apt-get install -y certbot

# Tạo certificate (thay your-domain.com bằng domain của bạn)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates vào thư mục gateway/certs
sudo mkdir -p gateway/certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem gateway/certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem gateway/certs/key.pem
sudo chown $USER:$USER gateway/certs/*.pem

# Setup auto-renewal (thêm vào crontab)
sudo crontab -e
# Thêm dòng sau (chạy mỗi ngày lúc 2:00 AM):
0 2 * * * certbot renew --quiet && docker compose -f /path/to/Proxy96/docker-compose.yml restart gateway
```

### Option 2: Self-signed Certificate (Chỉ cho Development/Testing)

```bash
mkdir -p gateway/certs

openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout gateway/certs/key.pem \
  -out gateway/certs/cert.pem \
  -days 365 \
  -subj "/CN=your-domain.com"
```

**Lưu ý:** Self-signed certificates sẽ gây cảnh báo trong client. Chỉ dùng cho testing.

## 5. Build và Start Services

```bash
# Build Docker images
docker compose build

# Start services
docker compose up -d

# Xem logs
docker compose logs -f

# Xem logs của service cụ thể
docker compose logs -f backend
docker compose logs -f gateway
```

## 6. Database Setup (Migrations)

```bash
# Chạy migrations
docker compose exec backend npm run migration:run

# Seed data (optional - chỉ nếu cần data mẫu)
docker compose exec backend npm run seed
```

**Lưu ý:** Sau khi seed, đổi mật khẩu tài khoản admin ngay lập tức!

## 7. Verification (Kiểm tra Services)

### Kiểm tra containers đang chạy

```bash
docker compose ps
```

Kết quả mong đợi:
```
NAME                 STATUS          PORTS
Proxy96-backend     Up (healthy)    0.0.0.0:3300->3300/tcp
Proxy96-gateway     Up              0.0.0.0:8080->8080/tcp
Proxy96-postgres    Up (healthy)    0.0.0.0:5432->5432/tcp
Proxy96-redis       Up (healthy)    0.0.0.0:6379->6379/tcp
```

### Kiểm tra Backend API

```bash
# Health check
curl http://localhost:3300/health

# Hoặc từ bên ngoài (nếu đã mở firewall)
curl http://your-server-ip:3300/health
```

### Kiểm tra Gateway

```bash
# Test TLS connection
openssl s_client -connect localhost:8080 -servername your-domain.com
```

### Kiểm tra Database

```bash
# Connect vào PostgreSQL
docker compose exec postgres psql -U proxyadmin -d Proxy96

# Kiểm tra tables
\dt

# Exit
\q
```

### Kiểm tra Redis

```bash
# Connect vào Redis
docker compose exec redis redis-cli -a <REDIS_PASSWORD>

# Test
PING
# Kết quả: PONG

# Exit
exit
```

## 8. Firewall Configuration

### Ubuntu/Debian (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (quan trọng - làm trước!)
sudo ufw allow 22/tcp

# Allow Backend API
sudo ufw allow 3300/tcp

# Allow Gateway (nếu cần truy cập từ bên ngoài)
sudo ufw allow 8080/tcp

# Allow PostgreSQL (chỉ nếu cần remote access, không khuyến nghị)
# sudo ufw allow from <trusted-ip> to any port 5432

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# Start firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow services
sudo firewall-cmd --permanent --add-port=3300/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

**Lưu ý bảo mật:**
- Chỉ mở ports cần thiết
- PostgreSQL và Redis nên chỉ accessible từ localhost
- Sử dụng VPN hoặc SSH tunnel để truy cập database từ xa

## 9. Reverse Proxy (Nginx - Khuyến nghị)

### Cài đặt Nginx

```bash
sudo apt-get install -y nginx
```

### Cấu hình Nginx cho Backend API

Tạo file `/etc/nginx/sites-available/Proxy96-backend`:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable site và test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/Proxy96-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 10. Updates (Cập nhật ứng dụng)

### Cập nhật code

```bash
# Pull latest code
git pull

# Rebuild và restart
docker compose build
docker compose up -d

# Chạy migrations nếu có
docker compose exec backend npm run migration:run
```

### Rolling update (không downtime)

```bash
# Build new images
docker compose build

# Restart services một cách tuần tự
docker compose up -d --no-deps backend
sleep 10
docker compose up -d --no-deps gateway
```

## 11. Backup và Restore

### Backup Database

```bash
# Tạo backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/Proxy96"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U proxyadmin Proxy96 | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis (optional)
docker compose exec -T redis redis-cli -a <REDIS_PASSWORD> --rdb /data/dump.rdb
docker compose cp redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup-db.sh

# Setup cron job (chạy mỗi ngày lúc 3:00 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /path/to/backup-db.sh") | crontab -
```

### Restore Database

```bash
# Restore từ backup
gunzip -c /backup/Proxy96/db_20240101_030000.sql.gz | docker compose exec -T postgres psql -U proxyadmin -d Proxy96
```

### Backup Docker Volumes

```bash
# Backup volumes
docker run --rm \
  -v Proxy96_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz -C /data .

docker run --rm \
  -v Proxy96_redis_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/redis_data_backup.tar.gz -C /data .
```

## 12. Monitoring và Logging

### Xem logs

```bash
# Tất cả services
docker compose logs -f

# Service cụ thể
docker compose logs -f backend
docker compose logs -f gateway

# Last 100 lines
docker compose logs --tail=100 backend
```

### Log rotation

Docker tự động rotate logs. Để giới hạn kích thước:

```yaml
# Thêm vào docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health checks

```bash
# Backend health
curl http://localhost:3300/health

# Gateway (qua TLS)
openssl s_client -connect localhost:8080 -quiet < /dev/null
```

## 13. Security Best Practices

1. **Đổi tất cả mật khẩu mặc định**
2. **Sử dụng strong JWT_SECRET** (ít nhất 32 ký tự ngẫu nhiên)
3. **Không expose PostgreSQL và Redis ra ngoài** (chỉ localhost)
4. **Sử dụng TLS certificates từ CA hợp lệ** (Let's Encrypt)
5. **Setup firewall** (chỉ mở ports cần thiết)
6. **Regular updates** (OS, Docker, containers)
7. **Backup thường xuyên** (database, volumes)
8. **Monitor logs** (phát hiện bất thường)
9. **Sử dụng reverse proxy** (Nginx với SSL)
10. **Limit resource usage** (nếu cần):

```yaml
# Thêm vào docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 14. Troubleshooting

### Services không start

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Check resource usage
docker stats
```

### Database connection errors

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Check connection
docker compose exec backend npm run typeorm query "SELECT 1"
```

### Gateway TLS errors

```bash
# Verify certificates
openssl x509 -in gateway/certs/cert.pem -text -noout

# Check permissions
ls -la gateway/certs/
```

### High memory usage

```bash
# Check resource usage
docker stats

# Restart services
docker compose restart
```

### Port already in use

```bash
# Check which process is using the port
sudo lsof -i :3300
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>
```

## 15. Performance Tuning

### PostgreSQL tuning

Tạo file `postgresql.conf` và mount vào container (advanced):

```yaml
# Thêm vào docker-compose.yml
services:
  postgres:
    volumes:
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

### Redis tuning

```yaml
# Thêm vào docker-compose.yml
services:
  redis:
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## 16. Maintenance

### Clean up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (cẩn thận!)
docker volume prune

# Remove unused networks
docker network prune
```

### Update Docker images

```bash
# Pull latest base images
docker compose pull

# Rebuild
docker compose build --no-cache
```

## Support

Nếu gặp vấn đề, kiểm tra:
1. Logs: `docker compose logs -f`
2. Container status: `docker compose ps`
3. Resource usage: `docker stats`
4. Documentation trong repository
