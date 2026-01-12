# Build stage for Go gateway
FROM golang:1.21-alpine AS go-builder

WORKDIR /app

# Copy go mod files first (better cache layer)
COPY go.mod go.sum ./
# Download dependencies with BuildKit cache mount (requires DOCKER_BUILDKIT=1)
# This caches Go modules between builds
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy source code
COPY . .

# Build application with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s' \
    -trimpath \
    -o gateway main.go

# Final stage - minimal alpine
FROM alpine:latest

# Install only ca-certificates (no cache to reduce size)
RUN apk --no-cache --update add ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /root/

# Copy Go gateway binary
COPY --from=go-builder /app/gateway /usr/local/bin/gateway

EXPOSE 8080

# Start gateway
CMD ["/usr/local/bin/gateway"]
