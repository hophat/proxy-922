#!/bin/bash

# Script để test TLS connection đến Gateway
# Gateway không phải HTTP server, nên không thể dùng curl HTTP
# Script này chỉ test TLS handshake

GATEWAY_HOST="${GATEWAY_HOST:-localhost}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"

echo "🔍 Testing TLS connection to Gateway at ${GATEWAY_HOST}:${GATEWAY_PORT}"
echo ""

# Test 1: Kiểm tra TLS handshake với openssl
echo "Test 1: TLS Handshake với OpenSSL"
echo "-----------------------------------"
echo | openssl s_client -connect ${GATEWAY_HOST}:${GATEWAY_PORT} \
  -tls1_2 \
  -verify_return_error \
  2>&1 | grep -E "(Protocol|Cipher|Verify return code)" || echo "Connection failed"

echo ""
echo "Test 2: Kiểm tra với curl (sẽ fail vì Gateway không phải HTTP server)"
echo "-----------------------------------"
curl -v --tlsv1.2 -k https://${GATEWAY_HOST}:${GATEWAY_PORT}/ 2>&1 | head -20 || echo "Expected to fail - Gateway is not an HTTP server"

echo ""
echo "✅ Lưu ý:"
echo "- Gateway là TLS server nhận token và SOCKS5 requests"
echo "- Không thể test bằng curl HTTP thông thường"
echo "- Client Electron đã được cấu hình đúng với TLS 1.2+"
echo "- Để test đầy đủ, cần dùng Client Electron hoặc SOCKS5 client"

