# Hướng dẫn Migrate Database

Script này giúp bạn tạo database mới và migrate data từ database cũ (tsh_db) sang database mới.

## Thông tin Database

**Database nguồn (cũ):**
- Host: 14.225.254.130
- Port: 5434
- Database: tsh_db
- User: tsh_db
- Password: Tsh123qwe

**Database đích (mới):**
- Mặc định: proxy992_new (có thể thay đổi)

## Cách sử dụng

### Cách 1: Sử dụng script bash (Khuyến nghị)

```bash
# Chạy script với cấu hình mặc định (tạo database proxy992_new)
./migrate-database.sh

# Hoặc chỉ định database mới
TARGET_DB=proxy992_new ./migrate-database.sh

# Hoặc chỉ định host/port/user khác
TARGET_HOST=14.225.254.130 \
TARGET_PORT=5434 \
TARGET_DB=proxy992_new \
TARGET_USER=tsh_db \
TARGET_PASSWORD=Tsh123qwe \
./migrate-database.sh
```

Script sẽ:
1. ✅ Kiểm tra kết nối database nguồn
2. ✅ Tạo database mới (hoặc hỏi nếu đã tồn tại)
3. ✅ Chạy migrations để tạo schema mới
4. ✅ Migrate data từ database cũ sang database mới

### Cách 2: Chạy từng bước thủ công

#### Bước 1: Tạo database mới

```bash
export PGPASSWORD="Tsh123qwe"
psql -h 14.225.254.130 -p 5434 -U tsh_db -d postgres -c "CREATE DATABASE proxy992_new;"
```

#### Bước 2: Chạy migrations

```bash
cd backend

# Tạo/update file .env với thông tin database mới
cat > .env << EOF
DATABASE_HOST=14.225.254.130
DATABASE_PORT=5434
DATABASE_USER=tsh_db
DATABASE_PASSWORD=Tsh123qwe
DATABASE_NAME=proxy992_new
EOF

# Chạy migrations
npm run migration:run
```

#### Bước 3: Migrate data

```bash
# Set biến môi trường cho source database
export SOURCE_DB_HOST=14.225.254.130
export SOURCE_DB_PORT=5434
export SOURCE_DB_NAME=tsh_db
export SOURCE_DB_USER=tsh_db
export SOURCE_DB_PASSWORD=Tsh123qwe

# Chạy script migrate data
npm run migrate:from-old-db
```

## Lưu ý

1. **Yêu cầu**: Cần cài đặt PostgreSQL client tools (psql, pg_dump)
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql-client` hoặc `sudo yum install postgresql`

2. **Backup**: File `.env` cũ sẽ được backup tự động trước khi thay đổi

3. **Schema**: Script sẽ tự động map các cột có tên giống nhau. Nếu schema khác nhau, bạn có thể cần chỉnh sửa file `backend/src/database/migrate-from-old-db.ts`

4. **Conflict**: Nếu có dữ liệu trùng lặp (dựa trên primary key), script sẽ bỏ qua (ON CONFLICT DO NOTHING)

5. **Thứ tự migrate**: Script sẽ migrate các bảng theo thứ tự để đảm bảo foreign keys được thỏa mãn:
   - users
   - tokens
   - socks5_proxies
   - socks5_upstreams
   - gateways
   - gateway_ports
   - port_mappings
   - user_proxy_purchases

## Troubleshooting

### Lỗi kết nối
- Kiểm tra firewall/network
- Kiểm tra thông tin kết nối (host, port, user, password)
- Thử kết nối thủ công: `psql -h 14.225.254.130 -p 5434 -U tsh_db -d tsh_db`

### Lỗi migration
- Kiểm tra file `.env` trong thư mục `backend/`
- Kiểm tra log để xem lỗi cụ thể
- Đảm bảo database mới đã được tạo

### Lỗi migrate data
- Kiểm tra schema của database cũ và mới có khớp không
- Xem log để biết bảng nào gặp lỗi
- Có thể cần chỉnh sửa mapping trong file `migrate-from-old-db.ts`
