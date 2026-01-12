# Giải thích Kiến trúc SOCKS5 Proxy

## Vấn đề hiện tại

User đang cố test SOCKS5 với lệnh:
```bash
curl --socks5-hostname user:pass@localhost:10002 https://api.ipify.org
```

Nhưng gặp lỗi: `Failed to connect to localhost port 10002`

## Tại sao không hoạt động?

### Ports 10000-20000 chỉ là metadata

- **KHÔNG phải** SOCKS5 ports thực tế
- Chỉ dùng để **tracking** trong database
- Gateway **KHÔNG expose** SOCKS5 server trên các ports này

### Gateway chỉ lắng nghe TLS trên port 8080

Gateway service chỉ expose:
- **Port 8080**: TLS endpoint (không phải SOCKS5 trực tiếp)
- Protocol: TLS + Token authentication
- Sau khi authenticate, mới tunnel SOCKS5 request

## Kiến trúc thực tế

```
┌─────────┐         ┌──────────┐         ┌──────────────┐         ┌─────────┐
│  User   │ ────►   │ Gateway  │ ────►   │   Upstream   │ ────►   │ Target  │
│         │  TLS    │ (8080)   │ SOCKS5  │ SOCKS5 Proxy │         │ Website │
└─────────┘  Token  └──────────┘         └──────────────┘         └─────────┘
```

### Luồng kết nối:

1. User kết nối TLS đến `gateway:8080`
2. Gửi token: `TOKEN:<jwt-token>\n`
3. Gateway xác thực token
4. User gửi SOCKS5 request
5. Gateway tunnel đến upstream SOCKS5 proxy
6. Upstream proxy kết nối đến target website

## Cách test đúng

### Option 1: Dùng Client App (Electron)

Client app sẽ:
1. Kết nối TLS đến gateway:8080
2. Tạo local SOCKS5 server trên port 1080
3. User có thể dùng `127.0.0.1:1080` như SOCKS5 proxy

```bash
# Sau khi client app chạy và connect
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

### Option 2: Viết script để connect qua Gateway TLS

Cần implement:
- TLS connection đến gateway:8080
- Gửi token
- Gửi SOCKS5 request
- Handle SOCKS5 response

Xem file `GATEWAY_USAGE.md` để biết chi tiết.

## Connection string trong website

Connection string `socks5://username:password@localhost:10002` trong website **KHÔNG đúng** với kiến trúc hiện tại.

Nếu muốn user có thể dùng curl trực tiếp, cần:

### Option A: Expose SOCKS5 server trên ports 10000-20000

Cần một service expose SOCKS5 server thực tế trên các ports này:
- Mỗi port map với một upstream proxy
- User connect SOCKS5 trực tiếp đến port đó
- Service authenticate và tunnel đến upstream

### Option B: Giữ kiến trúc hiện tại

- User phải dùng Client App
- Hoặc implement script để connect qua Gateway TLS
- Connection string chỉ để tham khảo, không dùng trực tiếp với curl

## Khuyến nghị

**Option B** (giữ kiến trúc hiện tại) vì:
- Đơn giản hơn (chỉ 1 TLS endpoint)
- Bảo mật hơn (TLS encryption)
- Dễ quản lý (tất cả logic ở Gateway)
- User dùng Client App (đã có sẵn)

Nếu cần test nhanh, dùng Client App và test với:
```bash
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```
