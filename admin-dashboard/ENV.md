# Environment Variables

File này mô tả các biến môi trường được sử dụng trong admin dashboard.

## Cách sử dụng

Tạo file `.env` trong thư mục `admin-dashboard` với các biến sau:

```env
# API Configuration
VITE_API_URL=http://localhost:3300

# Admin Base Path
# Base path cho admin dashboard (mặc định: /admin)
# Ví dụ: /admin, /dashboard, /admin-panel
VITE_ADMIN_BASE_PATH=/admin
```

## Các biến môi trường

### VITE_API_URL
- **Mô tả**: URL của backend API
- **Mặc định**: `http://localhost:3300`
- **Ví dụ**: `http://localhost:3300`, `https://api.example.com`

### VITE_ADMIN_BASE_PATH
- **Mô tả**: Base path cho admin dashboard. Tất cả các route sẽ được prefix với path này.
- **Mặc định**: `/admin`
- **Ví dụ**: 
  - `/admin` - Admin dashboard sẽ chạy tại `/admin/login`, `/admin/dashboard`, etc.
  - `/dashboard` - Admin dashboard sẽ chạy tại `/dashboard/login`, `/dashboard/dashboard`, etc.
  - `/admin-panel` - Admin dashboard sẽ chạy tại `/admin-panel/login`, `/admin-panel/dashboard`, etc.

## Lưu ý

- Tất cả các biến môi trường phải có prefix `VITE_` để Vite có thể expose chúng cho client-side code.
- Sau khi thay đổi biến môi trường, cần restart dev server.
- File `.env` đã được thêm vào `.gitignore` để không commit lên git.
