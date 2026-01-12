# Hướng dẫn sử dụng Gateway trực tiếp

## Thay đổi kiến trúc

Hệ thống đã được đơn giản hóa: **không còn local proxy server**, client kết nối trực tiếp đến Gateway.

```
User App → Gateway (TLS + Token) → SOCKS5 Pool → Target Website
```

## Trong Client App

1. **Đăng nhập**: Sử dụng email và password để đăng nhập
2. **Connect to Gateway**: Click nút "Connect to Gateway" để kích hoạt kết nối
3. **Kiểm tra status**: Status sẽ chuyển từ "Disconnected" sang "Connected to Gateway"
4. **Gateway Connection**: Kết nối được quản lý bởi Gateway server

## Cách Gateway hoạt động

Gateway nhận kết nối TLS với token authentication, sau đó:
- Xác thực token với Backend
- Chọn proxy từ pool (rotate hoặc sticky mode)
- Tạo tunnel đến proxy thực tế
- Đếm traffic và kiểm tra quota

## Kết nối từ ứng dụng

Để kết nối từ ứng dụng của bạn đến Gateway, bạn cần:

1. **Lấy token** từ Client App (sau khi đăng nhập)
2. **Kết nối TLS** đến Gateway (mặc định: `localhost:8080`)
3. **Gửi token** theo format: `TOKEN:<token>\n`
4. **Gửi SOCKS5 request** sau token

### Ví dụ: Kết nối từ Node.js

```javascript
const tls = require('tls');
const net = require('net');

async function connectToGateway(token, gatewayHost = 'localhost', gatewayPort = 8080) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: gatewayHost,
      port: gatewayPort,
      rejectUnauthorized: false, // Cho self-signed certs trong development
    }, () => {
      // Gửi token
      socket.write(`TOKEN:${token}\n`);
      resolve(socket);
    });

    socket.on('error', reject);
  });
}

// Sử dụng
const token = 'your-jwt-token-here';
const gatewaySocket = await connectToGateway(token);

// Sau đó gửi SOCKS5 request
// Xem client/src/main/connection.ts và proxy-server.ts để biết cách implement SOCKS5
```

### Ví dụ: Kết nối từ Python

```python
import ssl
import socket

def connect_to_gateway(token, gateway_host='localhost', gateway_port=8080):
    # Tạo TLS connection
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE  # Cho self-signed certs
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tls_sock = context.wrap_socket(sock, server_hostname=gateway_host)
    tls_sock.connect((gateway_host, gateway_port))
    
    # Gửi token
    tls_sock.send(f'TOKEN:{token}\n'.encode())
    
    return tls_sock

# Sử dụng
token = 'your-jwt-token-here'
gateway_socket = connect_to_gateway(token)

# Sau đó gửi SOCKS5 request
```

## Cấu hình Gateway

Gateway được cấu hình qua environment variables:

- `GATEWAY_PORT`: Port Gateway lắng nghe (mặc định: 8080)
- `BACKEND_API_URL`: URL của Backend API
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Redis cho session management
- `TLS_CERT_PATH`, `TLS_KEY_PATH`: Đường dẫn đến TLS certificates

## Kiểm tra Gateway hoạt động

### Test 1: Kiểm tra Gateway đang chạy
```bash
# Kiểm tra container
docker compose ps gateway

# Xem logs
docker compose logs gateway

# Test kết nối TLS
openssl s_client -connect localhost:8080 -verify_return_error
```

### Test 2: Kiểm tra qua Client App
1. Mở Client App và đăng nhập
2. Click "Connect to Gateway"
3. Kiểm tra status phải là "Connected to Gateway"

## Troubleshooting

### Lỗi "Connection refused"
- Kiểm tra Gateway container đang chạy: `docker compose ps gateway`
- Kiểm tra port Gateway có bị app khác dùng không
- Kiểm tra firewall có chặn port Gateway không

### Lỗi "Invalid token"
- Kiểm tra token còn hợp lệ không (có thể đã hết hạn)
- Đăng nhập lại để lấy token mới
- Kiểm tra Backend API đang chạy: `docker compose ps backend`

### Lỗi "No proxy available"
- Kiểm tra có proxy nào active trong database không
- Kiểm tra Backend API logs: `docker compose logs backend`
- Kiểm tra proxy health check: Gateway tự động kiểm tra proxy health

### Lỗi "Quota exceeded"
- Kiểm tra quota usage trong Client App
- Nâng cấp plan hoặc mua thêm quota

## Lưu ý

1. **Security**: Gateway sử dụng TLS để mã hóa kết nối
2. **Token**: Token có thời hạn, cần đăng nhập lại khi hết hạn
3. **Quota**: Theo dõi quota usage để tránh bị chặn
4. **Performance**: Gateway tự động chọn proxy tốt nhất từ pool
5. **Sticky Session**: Gateway hỗ trợ sticky session để giữ cùng một proxy cho user

## So sánh với kiến trúc cũ

### Kiến trúc cũ (Local Proxy)
```
User App → 127.0.0.1:1080 (Local SOCKS5) → Gateway → Proxy Pool
```

### Kiến trúc mới (Gateway Direct)
```
User App → Gateway (TLS + Token) → Proxy Pool
```

**Ưu điểm của kiến trúc mới:**
- Đơn giản hơn: không cần local proxy server
- Ít resource hơn: không cần chạy SOCKS5 server trên client
- Dễ quản lý: tất cả logic ở Gateway
- Bảo mật hơn: TLS encryption từ đầu đến cuối
