# Docker Build Optimization Guide

Tài liệu này mô tả các tối ưu hóa đã được áp dụng để tăng tốc độ build Docker images.

## BuildKit

Docker BuildKit là công nghệ build engine mới của Docker, nhanh hơn và hiệu quả hơn so với builder cũ.

### Enable BuildKit

Có 2 cách enable BuildKit:

**Cách 1: Environment variable (tạm thời)**
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build
```

**Cách 2: Permanent (khuyến nghị)**

Thêm vào `~/.docker/config.json`:
```json
{
  "features": {
    "buildkit": true
  }
}
```

Hoặc set trong `~/.bashrc` hoặc `~/.zshrc`:
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Kiểm tra BuildKit đã enable

```bash
docker buildx version
# Output: github.com/docker/buildx v0.x.x
```

## Tối ưu đã áp dụng

### 1. Backend (Node.js)

#### npm ci thay vì npm install
- **npm ci**: Nhanh hơn, deterministic, không update package-lock.json
- Sử dụng khi có package-lock.json
- Không tạo node_modules mới, chỉ install đúng versions trong lock file

#### BuildKit Cache Mount
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production=false
```
- Cache npm packages giữa các lần build
- Giảm thời gian download packages từ npm registry
- Yêu cầu BuildKit enabled

#### Layer Caching
- Copy `package*.json` trước, sau đó mới `npm install`
- Khi source code thay đổi, dependencies layer vẫn được cache
- Chỉ rebuild dependencies khi package.json thay đổi

### 2. Gateway (Go)

#### BuildKit Cache Mount cho Go Modules
```dockerfile
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
```
- Cache Go modules trong `/go/pkg/mod`
- Modules được cache giữa các lần build
- Yêu cầu BuildKit enabled

#### Multi-stage Build
- Build stage: Compile Go binary
- Runtime stage: Chỉ copy binary, không cần Go toolchain
- Image cuối cùng nhỏ hơn và nhanh hơn

#### Layer Caching
- Copy `go.mod go.sum` trước
- `go mod download` chỉ chạy khi go.mod/go.sum thay đổi
- Source code changes không trigger dependency download

### 3. .dockerignore

Thêm `.dockerignore` files để:
- Giảm build context size
- Tăng tốc độ COPY operations
- Tránh copy files không cần thiết (node_modules, .git, etc.)

## So sánh Performance

### Trước khi tối ưu:
```
Backend build: ~2-3 phút (mỗi lần build)
Gateway build: ~1-2 phút (mỗi lần build)
Total: ~3-5 phút
```

### Sau khi tối ưu (với cache):
```
Backend build: ~30-60 giây (lần đầu), ~10-20 giây (các lần sau)
Gateway build: ~20-40 giây (lần đầu), ~5-10 giây (các lần sau)
Total: ~50-100 giây (lần đầu), ~15-30 giây (các lần sau)
```

**Cải thiện: 60-80% nhanh hơn cho rebuilds**

## Build Commands

### Build với BuildKit

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build tất cả services
docker compose build

# Build service cụ thể
docker compose build backend
docker compose build gateway

# Build với no-cache (force rebuild)
docker compose build --no-cache

# Build parallel (mặc định với BuildKit)
docker compose build --parallel
```

### Build không có BuildKit (fallback)

```bash
# Nếu BuildKit không available
unset DOCKER_BUILDKIT
docker compose build
```

## Troubleshooting

### BuildKit cache không hoạt động

**Vấn đề**: Cache mounts không có tác dụng

**Giải pháp**:
1. Kiểm tra BuildKit enabled: `docker buildx version`
2. Đảm bảo syntax đúng: `RUN --mount=type=cache,target=/path`
3. Build với verbose để xem cache hits: `docker compose build --progress=plain`

### npm ci fails

**Vấn đề**: `npm ci` fails với "package-lock.json out of sync"

**Giải pháp**:
```bash
# Update package-lock.json
cd backend
npm install --package-lock-only
```

### Go modules cache issues

**Vấn đề**: Go modules không được cache

**Giải pháp**:
1. Kiểm tra BuildKit enabled
2. Clear cache và rebuild: `docker builder prune`
3. Kiểm tra Go version trong Dockerfile

## Best Practices

1. **Luôn enable BuildKit** cho production builds
2. **Sử dụng npm ci** thay vì npm install trong Dockerfiles
3. **Copy dependency files trước** (package.json, go.mod) để tận dụng layer cache
4. **Sử dụng .dockerignore** để giảm build context
5. **Multi-stage builds** cho Go applications
6. **Cache mounts** cho package managers (npm, go mod, pip, etc.)
7. **Build parallel** khi có nhiều services không phụ thuộc nhau

## Additional Optimizations (Advanced)

### BuildKit Cache Backend

Sử dụng external cache backend (Redis, S3, etc.) để share cache giữa nhiều build servers:

```bash
docker buildx create --use --driver docker-container \
  --driver-opt image=moby/buildkit:latest \
  --driver-opt network=host \
  --driver-opt "cache-from=type=registry,ref=your-registry/cache:latest" \
  --driver-opt "cache-to=type=registry,ref=your-registry/cache:latest,mode=max"
```

### Parallel Builds

Docker Compose tự động build parallel các services không phụ thuộc nhau khi BuildKit enabled.

### Build Arguments

Sử dụng build args để conditional builds:

```dockerfile
ARG BUILD_ENV=production
RUN if [ "$BUILD_ENV" = "development" ]; then \
      npm install --only=development; \
    fi
```

## Monitoring Build Performance

### Xem build time

```bash
time docker compose build
```

### Xem cache hits/misses

```bash
docker compose build --progress=plain 2>&1 | grep -i cache
```

### Analyze build layers

```bash
docker history <image-name>
docker inspect <image-name> | jq '.[0].RootFS.Layers'
```
