# Fix Port Column Issue

## Vấn đề
TypeORM báo lỗi "column RotatingProxyPurchase.port does not exist" mặc dù column đã tồn tại trong database.

## Nguyên nhân
TypeORM đã cache metadata của entity khi server khởi động. Khi thêm column mới vào database, TypeORM cần được reload để nhận metadata mới.

## Giải pháp

### Bước 1: Verify column tồn tại
```bash
npm run drizzle:verify-port
```

### Bước 2: Restart Backend Server
**QUAN TRỌNG**: Bạn PHẢI restart backend server để TypeORM reload metadata.

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó start lại:
npm run start:dev
```

Hoặc nếu đang chạy production:
```bash
# Dừng process
# Rebuild và start lại
npm run build
npm run start:prod
```

### Bước 3: Verify
Sau khi restart, test API endpoint:
```bash
curl http://localhost:3300/rotating-proxy/my
```

## Lưu ý

1. **Column đã tồn tại**: Script verify đã confirm column `port` đã có trong database
2. **Entity đã có column**: `RotatingProxyPurchase` entity đã có `@Column({ name: 'port', ... })`
3. **Chỉ cần restart**: TypeORM sẽ tự động reload metadata khi server khởi động lại

## Nếu vẫn còn lỗi sau khi restart

1. Kiểm tra database connection string trong `.env`
2. Đảm bảo đang connect đúng database
3. Chạy lại migration:
   ```bash
   npm run drizzle:verify-port
   ```
