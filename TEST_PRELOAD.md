# Debug Preload Script Issue

## Vấn đề hiện tại

`electronAPI` không có sẵn trong renderer process, nghĩa là preload script không expose đúng cách.

## Kiểm tra

Khi chạy `npm run dev`, kiểm tra trong **TERMINAL** (không phải DevTools console):

1. Có thấy logs `[Preload] Preload script loaded` không?
   - ✅ Có: Preload script đã chạy, nhưng không expose đúng
   - ❌ Không: Preload script không được load

2. Có thấy logs `[Main] Preload exists: true` không?
   - ✅ Có: File tồn tại
   - ❌ Không: File không tìm thấy

3. Có thấy error nào về preload không?

## Giải pháp tạm thời

Nếu preload không hoạt động với Vite dev server, hãy thử build production và test:

```bash
cd client
npm run build
npm start
```

Trong production mode, preload sẽ hoạt động đúng hơn.

## Debug steps

1. **Kiểm tra preload file:**
```bash
ls -la client/dist/main/preload.js
cat client/dist/main/preload.js
```

2. **Kiểm tra logs trong terminal khi chạy:**
```bash
cd client
npm run dev
# Xem terminal output, không phải DevTools console
```

3. **Thử production build:**
```bash
cd client
npm run build
npm start
```

