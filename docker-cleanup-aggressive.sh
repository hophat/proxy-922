#!/bin/bash
# Docker Aggressive Cleanup Script - Xóa tất cả để giải phóng tối đa disk space

set -e

echo "🧹 Docker Aggressive Cleanup"
echo "============================="
echo -e "\033[1;31m⚠️  WARNING: This will remove ALL unused Docker resources!\033[0m"
echo ""

# Show initial disk usage
echo "Before cleanup:"
docker system df
echo ""
df -h / | tail -1
echo ""

# Ask for confirmation
read -p "Are you sure? This will remove ALL unused containers, images, volumes, networks, and build cache! (type 'yes' to continue): " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "🧹 Starting aggressive cleanup..."
echo ""

# Remove everything unused
docker system prune -af --volumes

echo ""
echo "✅ Aggressive cleanup completed!"
echo ""
echo "After cleanup:"
docker system df
echo ""
df -h / | tail -1
echo ""

echo -e "\033[0;32m✨ Done! Maximum disk space freed.\033[0m"
