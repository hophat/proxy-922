#!/bin/bash
# Docker Safe Cleanup Script - Chỉ xóa những gì an toàn (không hỏi)

set -e

echo "🧹 Docker Safe Cleanup (Auto)"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Show initial disk usage
echo "Before cleanup:"
docker system df
echo ""

echo "🧹 Starting safe cleanup..."
echo ""

# 1. Remove stopped containers (safe)
echo -e "${GREEN}Removing stopped containers...${NC}"
docker container prune -f
echo ""

# 2. Remove dangling images (safe)
echo -e "${GREEN}Removing dangling images...${NC}"
docker image prune -f
echo ""

# 3. Remove unused networks (safe)
echo -e "${GREEN}Removing unused networks...${NC}"
docker network prune -f
echo ""

# 4. Remove build cache older than 24 hours (safer than removing all)
echo -e "${GREEN}Removing build cache older than 24h...${NC}"
docker builder prune -af --filter "until=24h"
echo ""

echo "✅ Safe cleanup completed!"
echo ""
echo "After cleanup:"
docker system df
