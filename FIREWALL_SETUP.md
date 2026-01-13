# Hướng dẫn mở port cho Gateway Service

## Thông tin Gateway

- **Gateway IP**: `14.225.254.130` (IP của server)
- **Gateway Port**: `8080` (port gateway service lắng nghe)
- **Port Range 10000-20000**: Chỉ là metadata trong database, **KHÔNG cần mở** trên firewall

## Mở port trên server

### Nếu dùng UFW (Ubuntu/Debian)

```bash
# Mở port 8080 (TCP)
sudo ufw allow 8080/tcp

# Kiểm tra
sudo ufw status
```

### Nếu dùng firewalld (CentOS/RHEL)

```bash
# Mở port 8080
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Kiểm tra
sudo firewall-cmd --list-ports
```

### Nếu dùng iptables trực tiếp

```bash
# Mở port 8080
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT

# Lưu rules (tùy distro)
sudo iptables-save | sudo tee /etc/iptables/rules.v4
# hoặc
sudo netfilter-persistent save
```

## Kiểm tra port đã mở

```bash
# Kiểm tra từ server
sudo netstat -tlnp | grep 8080
# hoặc
sudo ss -tlnp | grep 8080

# Kiểm tra từ máy khác
telnet 14.225.254.130 8080
# hoặc
nc -zv 14.225.254.130 8080
```

## Lưu ý quan trọng

1. **Chỉ cần mở port 8080**: Gateway service chỉ listen trên port này
2. **Port range 10000-20000 KHÔNG cần mở**: Đây chỉ là metadata trong database để tracking
3. **Gateway IP = Server IP**: `14.225.254.130` là IP của server nơi gateway service chạy
4. **TLS/SSL**: Gateway service sử dụng TLS, nên đảm bảo có certificate hợp lệ

## Kiểm tra Gateway đang chạy

```bash
# Kiểm tra container (nếu dùng Docker)
docker ps | grep gateway

# Kiểm tra logs
docker logs Proxy96-gateway

# Test kết nối TLS
openssl s_client -connect 14.225.254.130:8080 -verify_return_error
```
