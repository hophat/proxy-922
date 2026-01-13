# Drizzle Migration Guide

Dự án đã được cấu hình để sử dụng Drizzle ORM cho quản lý migrations database.

## Cài đặt

Dependencies đã được cài đặt:
- `drizzle-orm`: ORM library
- `drizzle-kit`: Migration tool

## Cấu hình

File cấu hình: `drizzle.config.ts`

## Scripts

### Generate Migration
Tạo migration mới từ schema:
```bash
npm run drizzle:generate
```

### Chạy Migrations
Chạy tất cả migrations chưa được apply:
```bash
npm run drizzle:migrate
```

### Push Schema (Development)
Đồng bộ schema trực tiếp với database (chỉ dùng trong development):
```bash
npm run drizzle:push
```

### Drizzle Studio
Mở Drizzle Studio để xem và quản lý database:
```bash
npm run drizzle:studio
```

## Schema Location

Schema được định nghĩa tại: `src/database/drizzle/schema.ts`

## Migrations Location

Migrations được lưu tại: `src/database/drizzle/migrations/`

## Lưu ý

- Drizzle được sử dụng cho migrations, TypeORM vẫn được sử dụng cho ORM trong code
- Khi tạo migration mới, chạy `npm run drizzle:generate` để tự động tạo migration từ schema
- Luôn kiểm tra migration SQL trước khi chạy trong production
- Migration được track trong `src/database/drizzle/migrations/meta/_journal.json`
