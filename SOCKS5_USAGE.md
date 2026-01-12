# Hướng dẫn sử dụng SOCKS5 Proxy

## Trong Client App

1. **Đăng nhập**: Sử dụng email và password để đăng nhập
2. **Connect SOCKS5**: Click nút "Connect SOCKS5" để khởi động proxy server
3. **Kiểm tra status**: Status sẽ chuyển từ "○ Disconnected" sang "● Connected"
4. **SOCKS5 Address**: `127.0.0.1:1080`

## Cấu hình SOCKS5 trong các ứng dụng

### 1. Chrome / Edge / Chromium Browsers

**Cách 1: Command line (khuyên dùng)**
```bash
# Windows
chrome.exe --proxy-server="socks5://127.0.0.1:1080"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --proxy-server="socks5://127.0.0.1:1080"

# Linux
google-chrome --proxy-server="socks5://127.0.0.1:1080"
```

**Cách 2: Extension (Proxy SwitchyOmega)**
1. Cài đặt extension "Proxy SwitchyOmega" từ Chrome Web Store
2. Tạo profile mới:
   - Protocol: SOCKS5
   - Server: 127.0.0.1
   - Port: 1080
3. Chọn profile và bật proxy

### 2. Firefox

1. Mở Settings → General → Network Settings
2. Click "Settings..."
3. Chọn "Manual proxy configuration"
4. Điền:
   - SOCKS Host: `127.0.0.1`
   - Port: `1080`
   - Chọn "SOCKS v5"
   - Đánh dấu "Proxy DNS when using SOCKS v5"
5. Click OK

### 3. curl (Terminal)

```bash
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

### 4. wget

```bash
wget --proxy=on --proxy-type=socks5 --proxy-host=127.0.0.1 --proxy-port=1080 https://example.com
```

### 5. Git

```bash
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080
```

### 6. Node.js / npm

```bash
# Set environment variables
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080

# Hoặc trong code
process.env.HTTP_PROXY = 'socks5://127.0.0.1:1080';
process.env.HTTPS_PROXY = 'socks5://127.0.0.1:1080';
```

### 7. Python requests

```python
import requests

proxies = {
    'http': 'socks5://127.0.0.1:1080',
    'https': 'socks5://127.0.0.1:1080'
}

response = requests.get('https://api.ipify.org', proxies=proxies)
print(response.text)
```

Cần cài đặt `requests[socks]`:
```bash
pip install requests[socks]
```

### 8. macOS System Proxy (cho tất cả ứng dụng)

Sử dụng command line:
```bash
# Set system proxy
networksetup -setsocksfirewallproxy "Wi-Fi" 127.0.0.1 1080

# Enable SOCKS proxy
networksetup -setsocksfirewallproxystate "Wi-Fi" on

# Disable (khi không dùng)
networksetup -setsocksfirewallproxystate "Wi-Fi" off
```

### 9. Windows System Proxy

1. Settings → Network & Internet → Proxy
2. Manual proxy setup:
   - Turn on "Use a proxy server"
   - Address: `127.0.0.1`
   - Port: `1080`
   - Bypass: `localhost;127.*;10.*;172.16.*;192.168.*`

**Lưu ý**: Windows system proxy chỉ hỗ trợ HTTP/HTTPS, không hỗ trợ SOCKS5 trực tiếp. Cần dùng tool như Proxifier hoặc ProxyCap.

### 10. Android (via ProxyDroid hoặc Auto Proxy)

1. Cài đặt app "ProxyDroid" hoặc "Auto Proxy"
2. Cấu hình:
   - Proxy Type: SOCKS5
   - Proxy Host: `127.0.0.1` (nếu chạy trên cùng máy)
   - Proxy Port: `1080`
   - Username/Password: (không cần nếu không có auth)

## Kiểm tra Proxy hoạt động

### Test 1: Kiểm tra IP address
```bash
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

### Test 2: Kiểm tra qua browser
1. Mở browser với proxy
2. Truy cập: https://www.whatismyip.com
3. Xem IP address hiển thị

### Test 3: Test tốc độ
```bash
curl --socks5-hostname 127.0.0.1:1080 -o /dev/null -s -w "%{time_total}\n" https://www.google.com
```

## Troubleshooting

### Lỗi "Connection refused"
- Kiểm tra client app đã click "Connect SOCKS5" chưa
- Kiểm tra Status phải là "● Connected"
- Kiểm tra port 1080 có bị app khác dùng không

### Lỗi "SOCKS5 proxy failed"
- Kiểm tra gateway server có đang chạy không: `docker compose ps`
- Kiểm tra logs client app xem có lỗi gì không
- Thử disconnect và connect lại

### Proxy không hoạt động
- Kiểm tra firewall có chặn port 1080 không
- Thử restart client app
- Kiểm tra quota còn đủ không (Quota Usage)

## Lưu ý

1. **Quota**: Theo dõi Quota Usage để biết còn bao nhiêu data
2. **Disconnect**: Nhớ disconnect khi không dùng để tránh tốn quota
3. **Security**: Chỉ sử dụng trên localhost (127.0.0.1) để đảm bảo an toàn
4. **Performance**: Proxy có thể làm chậm kết nối một chút, tùy vào gateway server

