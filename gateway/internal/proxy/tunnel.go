package proxy

import (
	"fmt"
	"io"
	"log"
	"net"
	"time"

	"Proxy96-gateway/internal/traffic"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Blocked ports for security
var blockedPorts = map[int]bool{
	25:   true, // SMTP
	3389: true, // RDP
	22:   true, // SSH (optional)
	1433: true, // SQL Server (optional)
}

// validateTargetAddress kiểm tra tính hợp lệ của địa chỉ đích
func validateTargetAddress(target *TargetAddr) error {
	// Kiểm tra port hợp lệ (1-65535)
	if target.Port < 1 || target.Port > 65535 {
		return fmt.Errorf("invalid port: %d (must be 1-65535)", target.Port)
	}

	// Loại bỏ brackets từ IPv6 address nếu có (format: [::1] -> ::1)
	hostToParse := target.Host
	if len(hostToParse) >= 2 && hostToParse[0] == '[' && hostToParse[len(hostToParse)-1] == ']' {
		hostToParse = hostToParse[1 : len(hostToParse)-1]
	}

	// Parse IP để kiểm tra
	ip := net.ParseIP(hostToParse)
	if ip != nil {
		// Đây là IP address (IPv4 hoặc IPv6)
		return validateIPAddress(ip)
	}

	// Đây là domain name - kiểm tra độ dài và format cơ bản
	if len(target.Host) == 0 || len(target.Host) > 255 {
		return fmt.Errorf("invalid domain name: length must be 1-255 characters")
	}

	// Domain không được có brackets (chỉ IPv6 mới có)
	if len(target.Host) >= 2 && target.Host[0] == '[' && target.Host[len(target.Host)-1] == ']' {
		return fmt.Errorf("invalid domain name format: brackets not allowed in domain")
	}

	// Kiểm tra các domain đặc biệt không được phép
	normalizedDomain := hostToParse
	if normalizedDomain == "localhost" || normalizedDomain == "local" {
		return fmt.Errorf("localhost domain is not allowed")
	}

	return nil
}

// validateIPAddress kiểm tra các IP không được phép
func validateIPAddress(ip net.IP) error {
	if ip == nil {
		return fmt.Errorf("invalid IP address")
	}

	// Kiểm tra loopback/localhost
	if ip.IsLoopback() {
		return fmt.Errorf("loopback address is not allowed: %s", ip.String())
	}

	// Kiểm tra private IP ranges (RFC 1918 cho IPv4)
	if ip.To4() != nil {
		ipv4 := ip.To4()
		// 127.0.0.0/8 - Loopback (đã check ở trên nhưng double check)
		if ipv4[0] == 127 {
			return fmt.Errorf("localhost IP is not allowed: %s", ip.String())
		}
		// 10.0.0.0/8 - Private
		if ipv4[0] == 10 {
			return fmt.Errorf("private IP range is not allowed: %s", ip.String())
		}
		// 172.16.0.0/12 - Private
		if ipv4[0] == 172 && ipv4[1] >= 16 && ipv4[1] <= 31 {
			return fmt.Errorf("private IP range is not allowed: %s", ip.String())
		}
		// 192.168.0.0/16 - Private
		if ipv4[0] == 192 && ipv4[1] == 168 {
			return fmt.Errorf("private IP range is not allowed: %s", ip.String())
		}
		// 169.254.0.0/16 - Link-local
		if ipv4[0] == 169 && ipv4[1] == 254 {
			return fmt.Errorf("link-local address is not allowed: %s", ip.String())
		}
		// 0.0.0.0/8 - Invalid/Unspecified
		if ipv4[0] == 0 {
			return fmt.Errorf("invalid IP address: %s", ip.String())
		}
		// 224.0.0.0/4 - Multicast
		if ipv4[0] >= 224 && ipv4[0] <= 239 {
			return fmt.Errorf("multicast address is not allowed: %s", ip.String())
		}
		// 240.0.0.0/4 - Reserved
		if ipv4[0] >= 240 {
			return fmt.Errorf("reserved IP address is not allowed: %s", ip.String())
		}
	} else {
		// IPv6 validation
		// ::1 - Loopback (đã check ở IsLoopback)
		// fc00::/7 - Unique Local Address (ULA)
		if ip[0] == 0xfc || ip[0] == 0xfd {
			return fmt.Errorf("private IPv6 address is not allowed: %s", ip.String())
		}
		// fe80::/10 - Link-local
		if ip[0] == 0xfe && (ip[1]&0xc0) == 0x80 {
			return fmt.Errorf("link-local IPv6 address is not allowed: %s", ip.String())
		}
		// ff00::/8 - Multicast
		if ip[0] == 0xff {
			return fmt.Errorf("multicast IPv6 address is not allowed: %s", ip.String())
		}
		// :: - Unspecified
		if ip.IsUnspecified() {
			return fmt.Errorf("unspecified IPv6 address is not allowed: %s", ip.String())
		}
	}

	return nil
}

func CreateTunnel(
	clientConn net.Conn,
	proxyInfo *ProxyInfo,
	trafficCounter *traffic.Counter,
	userID string,
) error {
	// Read target address from client FIRST (before connecting to proxy)
	// This ensures we have the target info before attempting proxy connection
	log.Printf("[Tunnel] Reading target address from client")
	targetAddr, err := readTargetAddress(clientConn)
	if err != nil {
		return fmt.Errorf("failed to read target address: %v", err)
	}
	log.Printf("[Tunnel] Target address: %s:%d", targetAddr.Host, targetAddr.Port)

	// Validate target address (port, private IPs, reserved addresses, etc.)
	if err := validateTargetAddress(targetAddr); err != nil {
		return fmt.Errorf("target address validation failed: %v", err)
	}

	// Connect to SOCKS5 proxy
	proxyAddr := fmt.Sprintf("%s:%d", proxyInfo.Host, proxyInfo.Port)
	log.Printf("[Tunnel] Connecting to SOCKS5 proxy: %s (username: %s, hasPassword: %v)",
		proxyAddr, proxyInfo.Username, proxyInfo.Password != "")

	proxyConn, err := net.DialTimeout("tcp", proxyAddr, 5*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect to proxy: %v", err)
	}
	defer proxyConn.Close()

	// Perform SOCKS5 handshake
	log.Printf("[Tunnel] Performing SOCKS5 handshake with proxy %s", proxyAddr)
	if err := socks5Handshake(proxyConn, proxyInfo.Username, proxyInfo.Password); err != nil {
		log.Printf("[Tunnel] SOCKS5 handshake failed with proxy %s: %v", proxyAddr, err)
		return fmt.Errorf("SOCKS5 handshake failed: %v", err)
	}
	log.Printf("[Tunnel] SOCKS5 handshake successful with proxy %s", proxyAddr)

	// Check if port is blocked
	if blockedPorts[targetAddr.Port] {
		return fmt.Errorf("port %d is blocked", targetAddr.Port)
	}

	// Connect to target through SOCKS5
	if err := socks5Connect(proxyConn, targetAddr); err != nil {
		return fmt.Errorf("SOCKS5 connect failed: %v", err)
	}

	// Send success response to client
	clientConn.Write([]byte{0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})

	// Start bidirectional copy with traffic counting
	uploadDone := make(chan error, 1)
	downloadDone := make(chan error, 1)

	// Upload: client -> proxy -> target
	go func() {
		uploadBytes, err := copyWithCounting(clientConn, proxyConn, trafficCounter, userID, true)
		uploadDone <- err
		if err == nil {
			trafficCounter.AddTraffic(userID, uploadBytes, true)
		}
	}()

	// Download: target -> proxy -> client
	go func() {
		downloadBytes, err := copyWithCounting(proxyConn, clientConn, trafficCounter, userID, false)
		downloadDone <- err
		if err == nil {
			trafficCounter.AddTraffic(userID, downloadBytes, false)
		}
	}()

	// Wait for either direction to finish
	select {
	case <-uploadDone:
		proxyConn.Close()
	case <-downloadDone:
		clientConn.Close()
	}

	return nil
}

type TargetAddr struct {
	Host string
	Port int
}

func readTargetAddress(conn net.Conn) (*TargetAddr, error) {
	// Read SOCKS5 request - may need to read in chunks if data is split
	buffer := make([]byte, 256)

	// Set read timeout (reduced for faster response)
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	defer conn.SetReadDeadline(time.Time{}) // Clear deadline

	// Try to read at least 4 bytes first
	n, err := conn.Read(buffer[:4])
	if err != nil {
		log.Printf("[SOCKS5] Failed to read initial bytes: %v", err)
		return nil, fmt.Errorf("failed to read SOCKS5 request header: %v", err)
	}

	log.Printf("[SOCKS5] Read %d bytes initially: %x", n, buffer[:n])

	// If we got less than 4 bytes, try to read more
	if n < 4 {
		additional, err := conn.Read(buffer[n:])
		if err != nil {
			return nil, fmt.Errorf("failed to read SOCKS5 request: %v", err)
		}
		n += additional
		log.Printf("[SOCKS5] Read additional %d bytes, total: %d bytes: %x", additional, n, buffer[:n])
		if n < 4 {
			return nil, fmt.Errorf("invalid SOCKS5 request: too short (%d bytes)", n)
		}
	}

	// Check SOCKS5 version
	if buffer[0] != 0x05 {
		log.Printf("[SOCKS5] Invalid version: %d (expected 5), buffer: %x", buffer[0], buffer[:n])
		return nil, fmt.Errorf("invalid SOCKS version: %d (expected 5)", buffer[0])
	}

	// Check command (should be CONNECT = 0x01)
	cmd := buffer[1]
	if cmd != 0x01 {
		log.Printf("[SOCKS5] Invalid command: %d (expected CONNECT=1), buffer: %x", cmd, buffer[:n])
		return nil, fmt.Errorf("unsupported command: %d (expected CONNECT=1)", cmd)
	}

	// Reserved byte at buffer[2] should be 0x00

	addrType := buffer[3]
	log.Printf("[SOCKS5] Address type: %d (1=IPv4, 3=Domain, 4=IPv6)", addrType)

	var host string
	var port int
	var totalNeeded int

	if addrType == 0x01 {
		// IPv4: need 10 bytes total (4 header + 4 IP + 2 port)
		totalNeeded = 10
	} else if addrType == 0x03 {
		// Domain name: need at least 5 bytes to read length
		if n < 5 {
			additional, err := conn.Read(buffer[n:])
			if err != nil {
				return nil, fmt.Errorf("failed to read domain length: %v", err)
			}
			n += additional
			log.Printf("[SOCKS5] Read domain length, total: %d bytes: %x", n, buffer[:n])
		}
		domainLen := int(buffer[4])
		totalNeeded = 5 + domainLen + 2 // header + length + domain + port
		log.Printf("[SOCKS5] Domain name length: %d, total needed: %d", domainLen, totalNeeded)
	} else if addrType == 0x04 {
		// IPv6: need 22 bytes total (4 header + 16 IP + 2 port)
		totalNeeded = 22
	} else {
		log.Printf("[SOCKS5] Unsupported address type: %d, buffer: %x", addrType, buffer[:n])
		return nil, fmt.Errorf("unsupported address type: %d (expected 1=IPv4, 3=Domain, 4=IPv6)", addrType)
	}

	// Read remaining bytes if needed
	if n < totalNeeded {
		// Set timeout for reading remaining bytes (reduced for faster response)
		conn.SetReadDeadline(time.Now().Add(3 * time.Second))

		// Try to read remaining bytes in a loop to handle partial reads
		bytesNeeded := totalNeeded - n
		bytesRead := 0
		for bytesRead < bytesNeeded {
			readBytes, err := conn.Read(buffer[n+bytesRead : n+bytesNeeded])
			if readBytes > 0 {
				bytesRead += readBytes
			}
			if err != nil {
				// Check if it's a timeout and we have partial data
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() && bytesRead < bytesNeeded {
					log.Printf("[SOCKS5] Read timeout: got %d/%d bytes, need %d more",
						n+bytesRead, totalNeeded, bytesNeeded-bytesRead)
					log.Printf("[SOCKS5] Partial buffer: %x", buffer[:n+bytesRead])

					// For IPv4 with 9 bytes, we can try to use default port or wait a bit more
					if n+bytesRead == 9 && addrType == 0x01 {
						log.Printf("[SOCKS5] Got 9 bytes for IPv4 - trying one more read")
						// Try one more time with short timeout
						conn.SetReadDeadline(time.Now().Add(1 * time.Second))
						lastByte := make([]byte, 1)
						lastRead, lastErr := conn.Read(lastByte)
						if lastErr == nil && lastRead == 1 {
							buffer[n+bytesRead] = lastByte[0]
							bytesRead++
							log.Printf("[SOCKS5] Successfully read last byte: %x", lastByte[0])
						} else {
							log.Printf("[SOCKS5] Failed to read last byte: %v", lastErr)
							return nil, fmt.Errorf("incomplete SOCKS5 request: got %d bytes, need %d bytes (timeout)", n+bytesRead, totalNeeded)
						}
					} else {
						return nil, fmt.Errorf("incomplete SOCKS5 request: got %d bytes, need %d bytes (timeout)", n+bytesRead, totalNeeded)
					}
				} else if err == io.EOF && bytesRead < bytesNeeded {
					log.Printf("[SOCKS5] Connection closed early: got %d/%d bytes, need %d more",
						n+bytesRead, totalNeeded, bytesNeeded-bytesRead)
					log.Printf("[SOCKS5] Partial buffer: %x", buffer[:n+bytesRead])
					return nil, fmt.Errorf("incomplete SOCKS5 request: got %d bytes, need %d bytes", n+bytesRead, totalNeeded)
				} else {
					log.Printf("[SOCKS5] Failed to read remaining bytes: got %d/%d, need %d, error: %v",
						n+bytesRead, totalNeeded, bytesNeeded-bytesRead, err)
					if n+bytesRead > 0 {
						log.Printf("[SOCKS5] Partial buffer: %x", buffer[:min(n+bytesRead, 20)])
					}
					return nil, fmt.Errorf("failed to read complete SOCKS5 request: %v (got %d, need %d)", err, n+bytesRead, totalNeeded)
				}
			}
			// Reset deadline for next read
			conn.SetReadDeadline(time.Now().Add(3 * time.Second))
		}
		n = totalNeeded
		log.Printf("[SOCKS5] Read complete request: %d bytes: %x", n, buffer[:n])
	}

	// Parse address based on type
	if addrType == 0x01 {
		// IPv4
		if n < 10 {
			log.Printf("[SOCKS5] IPv4 address incomplete: got %d bytes, need 10", n)
			return nil, fmt.Errorf("invalid IPv4 address: incomplete (got %d bytes, need 10)", n)
		}
		host = fmt.Sprintf("%d.%d.%d.%d", buffer[4], buffer[5], buffer[6], buffer[7])
		port = int(buffer[8])<<8 | int(buffer[9])
	} else if addrType == 0x03 {
		// Domain name
		domainLen := int(buffer[4])
		if n < 5+domainLen+2 {
			log.Printf("[SOCKS5] Domain name incomplete: got %d bytes, need %d", n, 5+domainLen+2)
			return nil, fmt.Errorf("invalid domain name: incomplete")
		}
		host = string(buffer[5 : 5+domainLen])
		portOffset := 5 + domainLen
		port = int(buffer[portOffset])<<8 | int(buffer[portOffset+1])
	} else if addrType == 0x04 {
		// IPv6
		if n < 22 {
			log.Printf("[SOCKS5] IPv6 address incomplete: got %d bytes, need 22", n)
			return nil, fmt.Errorf("invalid IPv6 address: incomplete")
		}
		ipv6Parts := make([]string, 8)
		for i := 0; i < 8; i++ {
			offset := 4 + i*2
			ipv6Parts[i] = fmt.Sprintf("%02x%02x", buffer[offset], buffer[offset+1])
		}
		host = fmt.Sprintf("[%s]", fmt.Sprintf("%s:%s:%s:%s:%s:%s:%s:%s", ipv6Parts[0], ipv6Parts[1], ipv6Parts[2], ipv6Parts[3], ipv6Parts[4], ipv6Parts[5], ipv6Parts[6], ipv6Parts[7]))
		port = int(buffer[20])<<8 | int(buffer[21])
	}

	log.Printf("[SOCKS5] Parsed target address: %s:%d (type=%d)", host, port, addrType)

	return &TargetAddr{
		Host: host,
		Port: port,
	}, nil
}

func socks5Handshake(conn net.Conn, username, password string) error {
	// Send greeting with supported methods
	// If we have credentials, offer both methods to let proxy choose
	// Some proxies require username/password even if we offer no-auth
	var greeting []byte
	if username != "" && password != "" {
		// Offer both no-auth and username/password auth
		// Proxy will choose the method it supports
		greeting = []byte{0x05, 0x02, 0x00, 0x02} // SOCKS5, 2 methods: no auth, username/password
		log.Printf("[SOCKS5] Sending greeting with 2 methods (no-auth, username/password) to proxy (username: %s)", username)
	} else {
		// Only offer no-auth
		greeting = []byte{0x05, 0x01, 0x00} // SOCKS5, 1 method: no auth
		log.Printf("[SOCKS5] Sending greeting with 1 method (no-auth) to proxy")
	}

	if _, err := conn.Write(greeting); err != nil {
		return fmt.Errorf("failed to send greeting: %v", err)
	}

	// Read server response
	response := make([]byte, 2)
	if _, err := io.ReadFull(conn, response); err != nil {
		return fmt.Errorf("failed to read server response: %v", err)
	}

	log.Printf("[SOCKS5] Server response: version=%d, method=%d (0x%02x)", response[0], response[1], response[1])

	if response[0] != 0x05 {
		return fmt.Errorf("invalid SOCKS version: %d", response[0])
	}

	selectedMethod := response[1]

	// Handle selected authentication method
	if selectedMethod == 0xFF {
		log.Printf("[SOCKS5] Proxy rejected all authentication methods (0xFF)")
		return fmt.Errorf("no acceptable authentication methods (proxy rejected all methods)")
	}

	if selectedMethod == 0x02 {
		// Username/password authentication required
		if username == "" || password == "" {
			return fmt.Errorf("username/password required but not provided")
		}

		auth := make([]byte, 0, 3+len(username)+len(password))
		auth = append(auth, 0x01) // Version
		auth = append(auth, byte(len(username)))
		auth = append(auth, []byte(username)...)
		auth = append(auth, byte(len(password)))
		auth = append(auth, []byte(password)...)

		if _, err := conn.Write(auth); err != nil {
			return fmt.Errorf("failed to send auth: %v", err)
		}

		authResponse := make([]byte, 2)
		if _, err := io.ReadFull(conn, authResponse); err != nil {
			return fmt.Errorf("failed to read auth response: %v", err)
		}

		if authResponse[1] != 0x00 {
			return fmt.Errorf("authentication failed (code: %d)", authResponse[1])
		}
	} else if selectedMethod == 0x00 {
		// No authentication required - success
		// Nothing more to do
	} else {
		// Server selected a different auth method than we offered
		return fmt.Errorf("unexpected authentication method: %d (expected 0x00 or 0x02)", selectedMethod)
	}

	return nil
}

func socks5Connect(conn net.Conn, target *TargetAddr) error {
	// Send CONNECT request
	request := make([]byte, 0, 300)
	request = append(request, 0x05) // SOCKS5
	request = append(request, 0x01) // CONNECT
	request = append(request, 0x00) // Reserved

	// Determine address type
	ip := net.ParseIP(target.Host)
	if ip != nil {
		if ip.To4() != nil {
			// IPv4
			request = append(request, 0x01) // IPv4 type
			request = append(request, ip.To4()...)
		} else {
			// IPv6
			request = append(request, 0x04) // IPv6 type
			request = append(request, ip.To16()...)
		}
	} else {
		// Domain name
		request = append(request, 0x03)                   // Domain type
		request = append(request, byte(len(target.Host))) // Domain length
		request = append(request, []byte(target.Host)...) // Domain bytes
	}

	// Port (2 bytes, big-endian)
	request = append(request, byte(target.Port>>8))
	request = append(request, byte(target.Port&0xFF))

	if _, err := conn.Write(request); err != nil {
		return err
	}

	// Read response (variable length depending on address type)
	response := make([]byte, 10)
	if _, err := io.ReadFull(conn, response); err != nil {
		return err
	}

	if response[1] != 0x00 {
		return fmt.Errorf("connection failed: code %d", response[1])
	}

	return nil
}

func copyWithCounting(
	src net.Conn,
	dst net.Conn,
	counter *traffic.Counter,
	userID string,
	isUpload bool,
) (int64, error) {
	buffer := make([]byte, 32*1024) // 32KB buffer
	var totalBytes int64

	for {
		nr, err := src.Read(buffer)
		if nr > 0 {
			nw, err := dst.Write(buffer[0:nr])
			if err != nil {
				return totalBytes, err
			}
			if nr != nw {
				return totalBytes, io.ErrShortWrite
			}
			totalBytes += int64(nw)
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			return totalBytes, err
		}
	}

	return totalBytes, nil
}
