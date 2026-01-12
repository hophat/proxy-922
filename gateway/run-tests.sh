#!/bin/bash

# Script đơn giản để chạy Go tests cho validation

set -e

cd "$(dirname "$0")"

echo "🧪 Running Validation Tests"
echo "==========================="
echo ""

echo "📦 Testing validateTargetAddress function..."
echo ""

go test -v ./internal/proxy -run TestValidateTargetAddress

echo ""
echo "📦 Testing validateIPAddress function..."
echo ""

go test -v ./internal/proxy -run TestValidateIPAddress

echo ""
echo "✅ All tests completed!"
echo ""

# Run all tests in proxy package
echo "📦 Running all tests in proxy package..."
echo ""

go test -v ./internal/proxy

echo ""
echo "✅ Done!"

