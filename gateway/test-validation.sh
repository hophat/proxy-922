#!/bin/bash

# Script để test validation của target address
# Script này test các trường hợp validation bằng cách gửi SOCKS5 requests với các địa chỉ khác nhau

GATEWAY_HOST="${GATEWAY_HOST:-localhost}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"
TOKEN="${TOKEN:-test-token}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Target Address Validation"
echo "======================================"
echo "Gateway: ${GATEWAY_HOST}:${GATEWAY_PORT}"
echo ""

# Function to send SOCKS5 request
send_socks5_request() {
    local host_type=$1  # "ipv4", "ipv6", "domain"
    local host_value=$2
    local port=$3
    local expected_result=$4  # "block", "allow"
    
    local request=""
    
    # SOCKS5 greeting
    echo -n -e "\x05\x01\x00" > /tmp/socks5_test
    
    if [ "$host_type" = "ipv4" ]; then
        # IPv4: 0x05 0x01 0x00 0x01 [4 bytes IP] [2 bytes port]
        IFS='.' read -r -a ip_parts <<< "$host_value"
        echo -n -e "\x05\x01\x00\x01" > /tmp/socks5_test
        printf "\x%02x" ${ip_parts[0]} ${ip_parts[1]} ${ip_parts[2]} ${ip_parts[3]} >> /tmp/socks5_test
        printf "\x%02x\x%02x" $((port >> 8)) $((port & 0xFF)) >> /tmp/socks5_test
    elif [ "$host_type" = "domain" ]; then
        # Domain: 0x05 0x01 0x00 0x03 [1 byte length] [domain] [2 bytes port]
        local domain_len=${#host_value}
        echo -n -e "\x05\x01\x00\x03" > /tmp/socks5_test
        printf "\x%02x" $domain_len >> /tmp/socks5_test
        echo -n "$host_value" >> /tmp/socks5_test
        printf "\x%02x\x%02x" $((port >> 8)) $((port & 0xFF)) >> /tmp/socks5_test
    elif [ "$host_type" = "ipv6" ]; then
        # IPv6: 0x05 0x01 0x00 0x04 [16 bytes IPv6] [2 bytes port]
        # Simplified - we'll use a simple representation
        echo -n -e "\x05\x01\x00\x04" > /tmp/socks5_test
        # For simplicity, we'll use ::1 (loopback)
        if [ "$host_value" = "::1" ]; then
            echo -n -e "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01" >> /tmp/socks5_test
        fi
        printf "\x%02x\x%02x" $((port >> 8)) $((port & 0xFF)) >> /tmp/socks5_test
    fi
    
    # Send request via TLS to gateway
    # Note: This is a simplified test - in reality you'd need proper TLS connection
    # and token authentication
    echo "⚠️  Manual test required - SOCKS5 over TLS needs proper client"
}

# Test cases
test_case() {
    local name=$1
    local host_type=$2
    local host=$3
    local port=$4
    local expected=$5
    
    echo -n "Testing: $name ... "
    
    if [ "$expected" = "block" ]; then
        echo -e "${YELLOW}Should be BLOCKED${NC}"
        echo "  Host: $host:$port"
    else
        echo -e "${YELLOW}Should be ALLOWED${NC}"
        echo "  Host: $host:$port"
    fi
    echo ""
}

echo "📋 Test Cases Overview"
echo "----------------------"
echo ""

echo "❌ Should be BLOCKED:"
echo ""

test_case "IPv4 localhost" "ipv4" "127.0.0.1" "80" "block"
test_case "IPv4 private 10.x" "ipv4" "10.0.0.1" "80" "block"
test_case "IPv4 private 192.168.x" "ipv4" "192.168.1.1" "80" "block"
test_case "IPv4 private 172.16.x" "ipv4" "172.16.0.1" "80" "block"
test_case "IPv4 link-local" "ipv4" "169.254.1.1" "80" "block"
test_case "IPv4 multicast" "ipv4" "224.0.0.1" "80" "block"
test_case "IPv4 reserved" "ipv4" "240.0.0.1" "80" "block"
test_case "IPv4 invalid 0.0.0.0" "ipv4" "0.0.0.0" "80" "block"
test_case "IPv6 loopback" "ipv6" "::1" "80" "block"
test_case "IPv6 ULA" "ipv6" "fc00::1" "80" "block"
test_case "IPv6 link-local" "ipv6" "fe80::1" "80" "block"
test_case "IPv6 multicast" "ipv6" "ff00::1" "80" "block"
test_case "Domain localhost" "domain" "localhost" "80" "block"
test_case "Invalid port 0" "ipv4" "8.8.8.8" "0" "block"
test_case "Invalid port > 65535" "ipv4" "8.8.8.8" "65536" "block"
test_case "Blocked port 22 (SSH)" "ipv4" "8.8.8.8" "22" "block"
test_case "Blocked port 25 (SMTP)" "ipv4" "8.8.8.8" "25" "block"

echo ""
echo "✅ Should be ALLOWED:"
echo ""

test_case "Valid IPv4 public" "ipv4" "8.8.8.8" "443" "allow"
test_case "Valid IPv4 public 2" "ipv4" "1.1.1.1" "80" "allow"
test_case "Valid IPv6 public" "ipv6" "2001:4860:4860::8888" "443" "allow"
test_case "Valid domain" "domain" "google.com" "443" "allow"
test_case "Valid domain with subdomain" "domain" "www.example.com" "443" "allow"

echo ""
echo "📝 How to test manually:"
echo "-----------------------"
echo ""
echo "1. Start the gateway:"
echo "   cd gateway && go run ."
echo ""
echo "2. Run Go tests:"
echo "   cd gateway/internal/proxy && go test -v -run TestValidateTargetAddress"
echo ""
echo "3. Or use a SOCKS5 client with proper authentication:"
echo "   - Connect to gateway with valid token"
echo "   - Try to connect to blocked addresses"
echo "   - Should receive validation errors"
echo ""
echo "4. Example blocked addresses to test:"
echo "   - 127.0.0.1:80"
echo "   - 192.168.1.1:80"
echo "   - localhost:80"
echo "   - [::1]:80"
echo ""
echo "5. Example allowed addresses:"
echo "   - 8.8.8.8:443"
echo "   - google.com:443"
echo "   - [2001:4860:4860::8888]:443"
echo ""

