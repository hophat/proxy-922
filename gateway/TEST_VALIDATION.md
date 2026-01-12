# Testing Target Address Validation

Tài liệu này mô tả cách test các validation functions cho target address.

## Các trường hợp validation

### ❌ Các địa chỉ bị CHẶN:

#### IPv4:
- **Loopback**: `127.0.0.0/8` (127.0.0.1, 127.x.x.x)
- **Private ranges**:
  - `10.0.0.0/8` (10.x.x.x)
  - `172.16.0.0/12` (172.16.x.x - 172.31.x.x)
  - `192.168.0.0/16` (192.168.x.x)
- **Link-local**: `169.254.0.0/16` (169.254.x.x)
- **Multicast**: `224.0.0.0/4` (224.x.x.x - 239.x.x.x)
- **Reserved**: `240.0.0.0/4` (240.x.x.x - 255.x.x.x)
- **Invalid/Unspecified**: `0.0.0.0/8` (0.x.x.x)

#### IPv6:
- **Loopback**: `::1`
- **Unique Local Address (ULA)**: `fc00::/7` (fc00:: - fdff::)
- **Link-local**: `fe80::/10` (fe80:: - febf::)
- **Multicast**: `ff00::/8` (ff00:: - ffff::)
- **Unspecified**: `::`

#### Domain:
- `localhost`
- `local`
- Domain có brackets `[example.com]` (không hợp lệ)

#### Port:
- Port < 1 hoặc > 65535
- Port bị chặn: 22 (SSH), 25 (SMTP), 1433 (SQL Server), 3389 (RDP)

### ✅ Các địa chỉ được PHÉP:

#### IPv4:
- Public IP addresses (không phải private/reserved)
- Ví dụ: `8.8.8.8`, `1.1.1.1`

#### IPv6:
- Public IPv6 addresses
- Ví dụ: `2001:4860:4860::8888`, `2606:4700:4700::1111`

#### Domain:
- Valid domain names
- Ví dụ: `google.com`, `www.example.com`, `subdomain.example.com`

## Cách chạy tests

### 1. Chạy Go Unit Tests

Chạy tất cả validation tests:

```bash
cd gateway
./run-tests.sh
```

Hoặc chạy trực tiếp với Go:

```bash
cd gateway
go test -v ./internal/proxy -run TestValidateTargetAddress
go test -v ./internal/proxy -run TestValidateIPAddress
```

### 2. Xem danh sách test cases

```bash
cd gateway
./test-validation.sh
```

Script này sẽ hiển thị danh sách các test cases và hướng dẫn test thủ công.

### 3. Test thủ công với Client

Để test thực tế qua gateway:

1. **Start gateway:**
   ```bash
   cd gateway
   go run .
   ```

2. **Sử dụng SOCKS5 client** (ví dụ qua Electron client) và thử kết nối đến:
   - ❌ `127.0.0.1:80` - Should fail với "loopback address is not allowed"
   - ❌ `192.168.1.1:80` - Should fail với "private IP range is not allowed"
   - ❌ `localhost:80` - Should fail với "localhost domain is not allowed"
   - ❌ `8.8.8.8:22` - Should fail với "port 22 is blocked"
   - ✅ `8.8.8.8:443` - Should succeed
   - ✅ `google.com:443` - Should succeed

## Test Files

- **`internal/proxy/tunnel_test.go`**: Go unit tests cho validation functions
- **`run-tests.sh`**: Script để chạy Go tests
- **`test-validation.sh`**: Script hiển thị danh sách test cases

## Kết quả test

Khi chạy `./run-tests.sh`, bạn sẽ thấy:

- ✅ Tất cả test cases đều pass
- ❌ Nếu có test fail, sẽ hiển thị chi tiết lỗi

Ví dụ output:
```
✅ All tests completed!
📦 Running all tests in proxy package...
--- PASS: TestValidateTargetAddress (0.00s)
--- PASS: TestValidateIPAddress (0.00s)
PASS
```

