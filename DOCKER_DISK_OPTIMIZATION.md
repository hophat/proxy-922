# Docker Disk Space Optimization Guide

Hướng dẫn tối ưu dung lượng disk sử dụng bởi Docker để tránh tràn ổ đĩa.

## Vấn đề

Docker có thể chiếm rất nhiều dung lượng disk:
- Build cache
- Unused images
- Stopped containers
- Unused volumes
- Unused networks

## Scripts Cleanup

Có 3 scripts cleanup với mức độ khác nhau:

### 1. docker-cleanup.sh (Interactive)

Script tương tác, hỏi từng bước:

```bash
./docker-cleanup.sh
```

**Xóa:**
- ✅ Stopped containers
- ✅ Dangling images
- ✅ Unused networks
- ⚠️ Unused volumes (hỏi trước)
- ⚠️ Build cache (hỏi trước)
- ⚠️ All unused images (hỏi trước)

**Phù hợp cho:** Manual cleanup khi cần kiểm soát chi tiết

### 2. docker-cleanup-safe.sh (Safe Auto)

Script an toàn, tự động xóa những gì không ảnh hưởng:

```bash
./docker-cleanup-safe.sh
```

**Xóa tự động:**
- ✅ Stopped containers
- ✅ Dangling images
- ✅ Unused networks
- ✅ Build cache cũ hơn 24h

**Phù hợp cho:** Cron job, tự động cleanup định kỳ

### 3. docker-cleanup-aggressive.sh (Aggressive)

Script xóa tất cả để giải phóng tối đa:

```bash
./docker-cleanup-aggressive.sh
```

**Xóa tất cả:**
- ✅ Stopped containers
- ✅ All unused images
- ✅ All unused volumes
- ✅ All unused networks
- ✅ All build cache

**⚠️ Cảnh báo:** Sẽ xóa tất cả, build lại sẽ chậm hơn

**Phù hợp cho:** Khi disk sắp đầy và cần giải phóng ngay

## Kiểm tra Disk Usage

### Docker disk usage

```bash
docker system df
```

Output:
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          5         2         2.5GB     1.2GB (48%)
Containers      3         1         50MB      25MB (50%)
Local Volumes   2         1         100MB     50MB (50%)
Build Cache     0         0         500MB     500MB
```

### System disk usage

```bash
df -h /
```

### Chi tiết từng loại

```bash
# Images
docker images

# Containers
docker ps -a

# Volumes
docker volume ls

# Build cache size
docker system df -v
```

## Manual Cleanup Commands

### Remove stopped containers

```bash
docker container prune -f
```

### Remove dangling images

```bash
docker image prune -f
```

### Remove all unused images

```bash
docker image prune -af
```

### Remove unused volumes

```bash
docker volume prune -f
```

### Remove unused networks

```bash
docker network prune -f
```

### Remove build cache

```bash
# Remove all build cache
docker builder prune -af

# Remove build cache older than 24h
docker builder prune -af --filter "until=24h"
```

### Remove everything unused

```bash
docker system prune -af --volumes
```

## Tự động Cleanup (Cron)

### Setup cron job cho safe cleanup

```bash
# Edit crontab
crontab -e

# Thêm dòng sau (chạy mỗi ngày lúc 2:00 AM)
0 2 * * * /path/to/proxy992/docker-cleanup-safe.sh >> /var/log/docker-cleanup.log 2>&1
```

### Hoặc systemd timer (Linux)

Tạo file `/etc/systemd/system/docker-cleanup.service`:

```ini
[Unit]
Description=Docker Cleanup
After=docker.service

[Service]
Type=oneshot
ExecStart=/path/to/proxy992/docker-cleanup-safe.sh
```

Tạo file `/etc/systemd/system/docker-cleanup.timer`:

```ini
[Unit]
Description=Docker Cleanup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:

```bash
sudo systemctl enable docker-cleanup.timer
sudo systemctl start docker-cleanup.timer
```

## Tối ưu Build để Giảm Disk Usage

### 1. Giảm Build Cache

Trong `docker-compose.yml`, có thể disable cache cho một số build:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      no_cache: false  # Set true để disable cache
```

### 2. Multi-stage Builds

Sử dụng multi-stage builds để giảm image size (đã có trong gateway Dockerfile):

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
# ... build steps

# Runtime stage (nhỏ hơn nhiều)
FROM alpine:latest
COPY --from=builder /app/binary /usr/local/bin/
```

### 3. .dockerignore

Đảm bảo có `.dockerignore` để giảm build context size (đã có).

### 4. Remove Build Dependencies

Trong Dockerfile, xóa build dependencies sau khi build xong:

```dockerfile
# Build
RUN npm ci && npm run build

# Remove dev dependencies
RUN npm prune --production
```

## Giới hạn Docker Disk Usage

### Docker Desktop (macOS/Windows)

Settings → Resources → Advanced:
- Disk image size: Giới hạn dung lượng
- Disk image location: Chọn ổ đĩa có nhiều space

### Docker daemon (Linux)

Thêm vào `/etc/docker/daemon.json`:

```json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.size=20G"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

## Monitoring Disk Usage

### Script monitor disk usage

Tạo file `check-disk.sh`:

```bash
#!/bin/bash
THRESHOLD=80  # Percent

USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
DOCKER_USAGE=$(docker system df --format "{{.Reclaimable}}" | head -1)

echo "Disk usage: ${USAGE}%"
echo "Docker reclaimable: ${DOCKER_USAGE}"

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "⚠️  Disk usage above ${THRESHOLD}%!"
    echo "Running cleanup..."
    ./docker-cleanup-safe.sh
fi
```

## Best Practices

1. **Chạy cleanup định kỳ**: Setup cron job cho safe cleanup
2. **Monitor disk usage**: Kiểm tra thường xuyên
3. **Sử dụng multi-stage builds**: Giảm image size
4. **Cleanup sau build**: Xóa build cache cũ
5. **Giới hạn log size**: Config log rotation
6. **Remove unused resources**: Cleanup thường xuyên
7. **Sử dụng .dockerignore**: Giảm build context
8. **Build only what you need**: Tránh build images không dùng

## Troubleshooting

### Disk vẫn đầy sau cleanup

```bash
# Check Docker root directory size
sudo du -sh /var/lib/docker  # Linux
# Hoặc
du -sh ~/Library/Containers/com.docker.docker  # macOS

# Check từng component
docker system df -v
```

### Cleanup không giải phóng đủ space

1. Check volumes đang được sử dụng: `docker volume ls`
2. Check images đang được sử dụng: `docker images`
3. Có thể cần aggressive cleanup: `./docker-cleanup-aggressive.sh`

### Build chậm sau aggressive cleanup

Đây là bình thường vì build cache đã bị xóa. Build lại sẽ tạo cache mới.

## Quick Reference

```bash
# Check disk usage
docker system df

# Safe cleanup (recommended for regular use)
./docker-cleanup-safe.sh

# Interactive cleanup (recommended for manual)
./docker-cleanup.sh

# Aggressive cleanup (when disk is full)
./docker-cleanup-aggressive.sh

# Manual commands
docker container prune -f          # Remove stopped containers
docker image prune -f              # Remove dangling images
docker image prune -af             # Remove all unused images
docker volume prune -f             # Remove unused volumes
docker network prune -f            # Remove unused networks
docker builder prune -af           # Remove build cache
docker system prune -af --volumes  # Remove everything unused
```
