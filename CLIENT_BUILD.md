# Hướng dẫn Build Client Application

Tài liệu này hướng dẫn cách build Proxy96 Client application cho Windows và macOS.

## Prerequisites (Yêu cầu)

- **Node.js**: Version 18+ (khuyến nghị 20+)
- **npm**: Version 9+ (thường đi kèm với Node.js)
- **Git**: Để clone repository
- **Windows**: Để build Windows version (hoặc có thể build cross-platform trên macOS/Linux)
- **macOS**: Để build macOS version (cần macOS để build macOS apps)

## 1. Clone và Setup

```bash
# Clone repository
git clone <repository-url> Proxy96
cd Proxy96/client

# Install dependencies
npm install
```

## 2. Cấu hình Environment Variables

### Tạo file .env

```bash
# Copy từ template
cp .env.example .env

# Chỉnh sửa file .env
nano .env
```

### Cấu hình .env

```env
# Backend API URL
BACKEND_URL=http://your-backend-api.com

# Gateway Server Configuration
GATEWAY_HOST=your-gateway-server.com
GATEWAY_PORT=8080
```

**Lưu ý quan trọng:**
- Các giá trị trong `.env` sẽ được inject vào code tại build time
- Mỗi lần thay đổi `.env`, bạn cần rebuild lại application
- File `.env` không được commit vào git (đã có trong .gitignore)
- File `.env.example` là template mẫu và được commit vào git

## 3. Build Application

### Build cho Development

```bash
# Build code (không package thành executable)
npm run build

# Chạy development mode
npm run dev
```

### Build cho Windows

```bash
# Build Windows installer
npm run build:win
```

Kết quả sẽ được lưu trong thư mục `dist/`:
- `dist/Proxy96 Client Setup X.X.X.exe` - Windows installer (NSIS)

**Yêu cầu:**
- Có thể build trên Windows, macOS, hoặc Linux
- Nếu build trên macOS/Linux, cần có Wine (cho NSIS installer)

### Build cho macOS

```bash
# Build macOS application
npm run build:mac
```

Kết quả sẽ được lưu trong thư mục `dist/`:
- `dist/Proxy96 Client-X.X.X.dmg` - macOS disk image
- `dist/Proxy96 Client-X.X.X-mac.zip` - macOS zip archive

**Yêu cầu:**
- Phải build trên macOS
- Cần file icon: `build/icon.icns` (nếu không có, sẽ dùng icon mặc định)

### Build cho cả hai platforms

```bash
# Build cả Windows và macOS
npm run build:all
```

**Lưu ý:** 
- `build:all` sẽ build cả Windows và macOS
- Nếu đang trên Windows, chỉ build Windows version
- Nếu đang trên macOS, có thể build cả hai (nhưng Windows build có thể có vấn đề)
- Khuyến nghị: Build Windows trên Windows, macOS trên macOS

## 4. Build Scripts Chi tiết

### Development Scripts

- `npm run dev` - Chạy development mode (hot reload)
- `npm run dev:main` - Build main process với watch mode
- `npm run dev:renderer` - Chạy Vite dev server cho renderer

### Build Scripts

- `npm run build` - Build code (không package)
  - `npm run build:main` - Build main process (TypeScript → JavaScript)
  - `npm run build:renderer` - Build renderer (React + Vite)

### Package Scripts

- `npm run build:win` - Build Windows installer
- `npm run build:mac` - Build macOS application
- `npm run build:all` - Build cả Windows và macOS

## 5. Cấu trúc Build Output

Sau khi build, cấu trúc thư mục:

```
client/
├── dist/
│   ├── main/              # Compiled main process code
│   │   ├── main.js
│   │   ├── auth.js
│   │   └── ...
│   ├── renderer/          # Compiled renderer code
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   ├── Proxy96 Client Setup X.X.X.exe  # Windows installer
│   ├── Proxy96 Client-X.X.X.dmg        # macOS disk image
│   └── Proxy96 Client-X.X.X-mac.zip    # macOS zip
└── ...
```

## 6. Environment Variables trong Build Process

Environment variables được inject vào build time bằng `dotenv-cli`:

1. File `.env` được load bởi `dotenv-cli`
2. Environment variables được set vào `process.env`
3. Code TypeScript đọc từ `process.env` (ví dụ: `process.env.BACKEND_URL`)
4. Khi compile, các giá trị này được giữ nguyên trong code JavaScript
5. Khi Electron app chạy, nó sử dụng các giá trị đã được inject

**Lưu ý:**
- Vì là build-time injection, mỗi lần đổi config cần rebuild
- Env vars được "bake" vào code, không đọc từ file .env khi app chạy
- Đây là cách an toàn hơn runtime .env file

## 7. Troubleshooting

### Build fails với lỗi "Cannot find module"

```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails với lỗi TypeScript

```bash
# Check TypeScript errors
npm run build:main

# Fix errors trước khi build package
```

### Windows build fails trên macOS/Linux

- Windows build trên macOS/Linux có thể có vấn đề
- Khuyến nghị: Build Windows version trên Windows
- Hoặc sử dụng CI/CD (GitHub Actions, etc.)

### macOS build fails với lỗi code signing

- macOS build không cần code signing cho development
- Để distribute qua App Store hoặc outside Mac App Store, cần code signing
- Xem [Electron Builder documentation](https://www.electron.build/) để setup code signing

### Icon không hiển thị

- Windows: Cần file `build/icon.ico`
- macOS: Cần file `build/icon.icns`
- Có thể convert từ PNG:
  - Windows: Sử dụng online converter hoặc ImageMagick
  - macOS: Sử dụng `iconutil` hoặc online converter

### Build output lớn

- Electron apps thường lớn (100MB+)
- Đây là bình thường vì bao gồm cả Chromium runtime
- Có thể optimize bằng cách:
  - Exclude unused dependencies
  - Sử dụng electron-builder compression
  - Tree-shaking (đã được Vite tự động làm)

## 8. Continuous Integration (CI/CD)

### GitHub Actions Example

Tạo file `.github/workflows/build-client.yml`:

```yaml
name: Build Client

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd client
          npm ci
      - name: Setup .env
        run: |
          cd client
          echo "BACKEND_URL=${{ secrets.BACKEND_URL }}" > .env
          echo "GATEWAY_HOST=${{ secrets.GATEWAY_HOST }}" >> .env
          echo "GATEWAY_PORT=${{ secrets.GATEWAY_PORT }}" >> .env
      - name: Build
        run: |
          cd client
          npm run build:win
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: client/dist/*.exe

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd client
          npm ci
      - name: Setup .env
        run: |
          cd client
          echo "BACKEND_URL=${{ secrets.BACKEND_URL }}" > .env
          echo "GATEWAY_HOST=${{ secrets.GATEWAY_HOST }}" >> .env
          echo "GATEWAY_PORT=${{ secrets.GATEWAY_PORT }}" >> .env
      - name: Build
        run: |
          cd client
          npm run build:mac
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: macos-app
          path: client/dist/*.{dmg,zip}
```

## 9. Distribution

### Windows

- File `.exe` là installer, user có thể chạy và cài đặt
- Có thể upload lên:
  - GitHub Releases
  - Website download page
  - File sharing service

### macOS

- File `.dmg` là disk image, user mount và kéo app vào Applications
- File `.zip` là archive, user giải nén và chạy
- Có thể upload lên:
  - GitHub Releases
  - Website download page
  - Mac App Store (cần code signing và Apple Developer account)

### Code Signing (Optional)

Để code sign apps (khuyến nghị cho production):

**Windows:**
- Cần code signing certificate từ trusted CA
- Cấu hình trong `electron-builder.yml`:
  ```yaml
  win:
    certificateFile: path/to/certificate.pfx
    certificatePassword: password
  ```

**macOS:**
- Cần Apple Developer account ($99/năm)
- Cấu hình trong `electron-builder.yml`:
  ```yaml
  mac:
    identity: "Developer ID Application: Your Name"
  ```

## 10. Version Management

Version được quản lý trong `package.json`:

```json
{
  "name": "Proxy96-client",
  "version": "1.0.0"
}
```

Khi build, electron-builder sẽ tự động sử dụng version từ `package.json`.

Để tăng version:

```bash
# Sử dụng npm version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Support

Nếu gặp vấn đề:
1. Kiểm tra Node.js version: `node --version` (cần 18+)
2. Kiểm tra dependencies: `npm list` (xem có conflicts không)
3. Xem logs build: Thông thường sẽ hiển thị lỗi cụ thể
4. Check electron-builder documentation: https://www.electron.build/
