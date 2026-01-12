#!/bin/bash
# Docker Cleanup Script - Giảm dung lượng disk sử dụng bởi Docker

set -e

echo "🧹 Docker Cleanup Script"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show disk usage
show_disk_usage() {
    echo -e "${YELLOW}📊 Docker disk usage:${NC}"
    docker system df
    echo ""
}

# Function to show current disk usage
show_system_disk() {
    echo -e "${YELLOW}💾 System disk usage:${NC}"
    df -h / | tail -1
    echo ""
}

# Show initial disk usage
echo "Before cleanup:"
show_disk_usage
show_system_disk

# Ask for confirmation
read -p "Continue with cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "🧹 Starting cleanup..."
echo ""

# 1. Remove stopped containers
echo -e "${GREEN}1. Removing stopped containers...${NC}"
STOPPED=$(docker ps -a -q -f status=exited | wc -l)
if [ "$STOPPED" -gt 0 ]; then
    docker container prune -f
    echo "   ✅ Removed stopped containers"
else
    echo "   ℹ️  No stopped containers to remove"
fi
echo ""

# 2. Remove unused images (not used by any container)
echo -e "${GREEN}2. Removing dangling images...${NC}"
DANGLING=$(docker images -f "dangling=true" -q | wc -l)
if [ "$DANGLING" -gt 0 ]; then
    docker image prune -f
    echo "   ✅ Removed dangling images"
else
    echo "   ℹ️  No dangling images to remove"
fi
echo ""

# 3. Remove unused volumes (be careful with this!)
echo -e "${GREEN}3. Removing unused volumes...${NC}"
echo "   ⚠️  This will remove volumes not used by any container"
read -p "   Remove unused volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
    echo "   ✅ Removed unused volumes"
else
    echo "   ⏭️  Skipped volume cleanup"
fi
echo ""

# 4. Remove unused networks
echo -e "${GREEN}4. Removing unused networks...${NC}"
docker network prune -f
echo "   ✅ Removed unused networks"
echo ""

# 5. Remove build cache (this can free up a lot of space!)
echo -e "${GREEN}5. Removing build cache...${NC}"
echo "   ⚠️  This will remove all build cache (next build will be slower)"
read -p "   Remove build cache? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker builder prune -af
    echo "   ✅ Removed build cache"
else
    echo "   ⏭️  Skipped build cache cleanup"
fi
echo ""

# 6. Remove all unused images (not just dangling)
echo -e "${GREEN}6. Removing unused images...${NC}"
echo "   ⚠️  This will remove images not used by any container"
read -p "   Remove all unused images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker image prune -af
    echo "   ✅ Removed unused images"
else
    echo "   ⏭️  Skipped unused images cleanup"
fi
echo ""

# Show final disk usage
echo ""
echo "✅ Cleanup completed!"
echo ""
echo "After cleanup:"
show_disk_usage
show_system_disk

echo -e "${GREEN}✨ Done!${NC}"
