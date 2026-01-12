# Hướng dẫn test SOCKS5 Proxy

## ⚠️ Lưu ý quan trọng

**Ports 10000-20000 KHÔNG phải SOCKS5 ports thực tế!**

- Gateway chỉ lắng nghe trên **port 8080 (TLS)**
- Ports 10000-20000 chỉ là **metadata tracking** trong database
- Connection string `socks5://username:password@localhost:10002` **KHÔNG hoạt động**

## Kiến trúc thực tế

```
User → Gateway (TLS port 8080) → Upstream SOCKS5 Proxy → Target
```

Gateway nhận kết nối TLS với token authentication, sau đó tunnel SOCKS5 request đến upstream proxy.

## Cách test đúng

### Option 1: Dùng Client App (khuyên dùng)

Client app sẽ tạo local SOCKS5 server trên port 1080:
```bash
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

### Option 2: Test Gateway TLS connection

Gateway chỉ hỗ trợ TLS + Token, không phải SOCKS5 trực tiếp:

```bash
# Test TLS connection (không phải SOCKS5)
openssl s_client -connect localhost:8080
```

Sau đó cần gửi token và SOCKS5 request theo protocol (xem GATEWAY_USAGE.md)

## ❌ KHÔNG thể test trực tiếp với curl như sau:

```bash
# ❌ SAI - Port 10002 không tồn tại như SOCKS5 server
curl --socks5-hostname user:pass@localhost:10002 https://api.ipify.org
```

### 2. Test với HTTP request

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT https://httpbin.org/ip
```

### 3. Test với headers

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  -H "User-Agent: Mozilla/5.0" \
  https://httpbin.org/headers
```

### 4. Test download file

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  -o test.html \
  https://example.com
```

### 5. Test với verbose mode (để debug)

```bash
curl -v --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  https://api.ipify.org
```

### 6. Test với timeout

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  --connect-timeout 10 \
  --max-time 30 \
  https://api.ipify.org
```

## Lấy thông tin từ API

### 1. Lấy danh sách purchases (cần token)

```bash
# Đăng nhập trước để lấy token
TOKEN="your-jwt-token-here"

# Lấy danh sách purchases
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3300/purchases/my | jq
```

### 2. Extract connection info từ response

```bash
# Lấy purchase đầu tiên và extract thông tin
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3300/purchases/my | jq -r '.[0] | "\(.gateway.ip):\(.port.port):\(.gatewayUsername):\(.gatewayPassword)"'
```

Output format: `localhost:10001:username:password`

### 3. Script tự động test

```bash
#!/bin/bash

# Lấy token (thay bằng token thực tế)
TOKEN="your-jwt-token-here"

# Lấy purchase info
PURCHASE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3300/purchases/my | jq -r '.[0]')

if [ "$PURCHASE" = "null" ] || [ -z "$PURCHASE" ]; then
  echo "❌ Không có purchase nào"
  exit 1
fi

# Extract info
GATEWAY_IP=$(echo $PURCHASE | jq -r '.gateway.ip')
PORT=$(echo $PURCHASE | jq -r '.port.port')
USERNAME=$(echo $PURCHASE | jq -r '.gatewayUsername')
PASSWORD=$(echo $PURCHASE | jq -r '.gatewayPassword')

echo "🔗 Testing SOCKS5: $GATEWAY_IP:$PORT"
echo "👤 Username: $USERNAME"

# Test connection
curl --socks5-hostname $USERNAME:$PASSWORD@$GATEWAY_IP:$PORT \
  https://api.ipify.org

echo ""
```

## Test với các service khác

### 1. Test IP geolocation

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  https://ipapi.co/json/
```

### 2. Test với Google

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  https://www.google.com
```

### 3. Test với website có HTTPS

```bash
curl --socks5-hostname USERNAME:PASSWORD@localhost:PORT \
  https://www.example.com
```

## Troubleshooting

### Lỗi "Connection refused"

```bash
# Kiểm tra gateway có đang chạy không
curl http://localhost:3300/gateways/public

# Kiểm tra port có accessible không
nc -zv localhost PORT
```

### Lỗi "Authentication failed"

- Kiểm tra username/password có đúng không
- Kiểm tra purchase còn active không (chưa hết hạn)

### Lỗi "Timeout"

- Kiểm tra upstream proxy có hoạt động không
- Kiểm tra network connection
- Thử tăng timeout: `--connect-timeout 30`

## Lưu ý

1. **Gateway IP**: Hiện tại là `localhost` (cho local dev)
2. **Port**: Được assign từ range 10000-20000
3. **Credentials**: Mỗi purchase có credentials riêng
4. **Expiry**: Purchase có thời hạn, kiểm tra `expiresAt`

## Quick test command

Thay thế các giá trị và chạy:

```bash
curl --socks5-hostname YOUR_USERNAME:YOUR_PASSWORD@localhost:YOUR_PORT \
  https://api.ipify.org?format=json
```

Expected output:
```json
{"ip":"xxx.xxx.xxx.xxx"}
```
