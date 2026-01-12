# Hướng dẫn Debug Client - API Connection

## Vấn đề đã được sửa

✅ **Đã thay thế `fetch` API bằng Node.js `http`/`https` module** trong Electron main process
✅ **Đã thêm logging chi tiết** để debug
✅ **Đã test kết nối** - HTTP requests hoạt động tốt

## Cách chạy lại Client

### Bước 1: Rebuild Client Code

```bash
cd client
npm run build:main
```

### Bước 2: Chạy Client

**Option 1: Development mode (với hot reload)**
```bash
cd client
npm run dev
```

**Option 2: Production mode**
```bash
cd client
npm run build
npm start
```

## Kiểm tra Logs

Khi chạy client, bạn sẽ thấy logs trong terminal:

- `🚀 Electron app starting...` - App đã khởi động
- `📡 Backend URL: http://localhost:3300` - URL backend
- `[IPC] Login request received` - Khi user click login
- `[HTTP] Making POST request` - Khi gọi API
- `[HTTP] Response received: 201` - Response từ backend

## Test Connection

Nếu muốn test connection trước khi chạy client:

```bash
cd client
node test-connection.js
```

Kết quả mong đợi:
```
✅ SUCCESS! Login worked!
Token received: Yes
```

## Kiểm tra Backend đang chạy

```bash
# Kiểm tra containers
docker compose ps

# Xem logs backend
docker compose logs backend -f

# Test API trực tiếp
curl http://localhost:3300/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## Troubleshooting

### 1. Client không gọi API

- **Kiểm tra**: Xem terminal có logs `[IPC]` không?
- **Nếu không**: Renderer process có thể chưa gọi IPC handlers đúng cách
- **Kiểm tra**: Mở DevTools (Ctrl+Shift+I hoặc Cmd+Option+I) và xem console

### 2. Lỗi "ECONNREFUSED" hoặc "Cannot connect"

- **Kiểm tra**: Backend có đang chạy không? `docker compose ps`
- **Kiểm tra**: Port 3300 có bị chặn không?
- **Kiểm tra**: `BACKEND_URL` trong client có đúng không?

### 3. Lỗi "Timeout"

- Backend có thể đang xử lý chậm
- Kiểm tra logs backend để xem có lỗi không

## Credentials mặc định

- Email: `admin@example.com`
- Password: `admin123`

## Next Steps

1. Chạy lại client với logging mới
2. Thử login và xem logs trong terminal
3. Nếu vẫn không thấy API calls, kiểm tra renderer process logs trong DevTools

