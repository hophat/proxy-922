package main

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"Proxy96-gateway/internal/auth"
	"Proxy96-gateway/internal/config"
	"Proxy96-gateway/internal/health"
	"Proxy96-gateway/internal/proxy"
	"Proxy96-gateway/internal/session"
	"Proxy96-gateway/internal/traffic"
)

// bufferedConn wraps a connection with a buffer for already-read data
type bufferedConn struct {
	net.Conn
	buf *bytes.Buffer
}

func newBufferedConn(conn net.Conn, initialData []byte) *bufferedConn {
	return &bufferedConn{
		Conn: conn,
		buf:  bytes.NewBuffer(initialData),
	}
}

func (bc *bufferedConn) Read(b []byte) (n int, err error) {
	// Read from buffer first
	if bc.buf.Len() > 0 {
		n, err = bc.buf.Read(b)
		if err == io.EOF {
			err = nil // Buffer empty, continue reading from connection
		}
		if n > 0 && err == nil {
			return n, nil
		}
	}
	// Then read from connection
	// Set timeout for reading (reduced for faster response)
	bc.Conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	defer bc.Conn.SetReadDeadline(time.Time{})
	return bc.Conn.Read(b)
}

func main() {
	cfg := config.Load()

	// Initialize Redis session store
	sessionStore := session.NewRedisStore(cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword)

	// Initialize auth validator
	authValidator := auth.NewValidator(cfg.BackendAPIURL, sessionStore)

	// Initialize proxy selector
	proxySelector := proxy.NewSelector(cfg.BackendAPIURL, sessionStore, cfg.StickyTTL)

	// Initialize traffic counter
	trafficCounter := traffic.NewCounter(cfg.BackendAPIURL)

	// Start health checker
	healthChecker := health.NewChecker(cfg)
	defer healthChecker.Stop()

	// Load TLS certificate
	cert, err := tls.LoadX509KeyPair(cfg.TLSCertPath, cfg.TLSKeyPath)
	if err != nil {
		log.Fatalf("Failed to load TLS certificate: %v", err)
	}

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12, // Use TLS 1.2 for better compatibility
	}

	// Start TCP listener
	listener, err := tls.Listen("tcp", fmt.Sprintf(":%d", cfg.GatewayPort), tlsConfig)
	if err != nil {
		log.Fatalf("Failed to start listener: %v", err)
	}
	defer listener.Close()

	log.Printf("🚀 Gateway listening on port %d (TLS)", cfg.GatewayPort)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down gateway...")
		listener.Close()
		os.Exit(0)
	}()

	// Accept connections
	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Failed to accept connection: %v", err)
			continue
		}

		go handleConnection(conn, authValidator, proxySelector, trafficCounter)
	}
}

func handleConnection(
	conn net.Conn,
	authValidator *auth.Validator,
	proxySelector *proxy.Selector,
	trafficCounter *traffic.Counter,
) {
	defer conn.Close()

	// Read token from connection (first 512 bytes should contain token)
	buffer := make([]byte, 512)
	n, err := conn.Read(buffer)
	if err != nil {
		return
	}

	// Extract token from buffer (format: "TOKEN:<token>\n")
	token := extractToken(buffer[:n])
	if token == "" {
		conn.Write([]byte("ERROR: No token provided\n"))
		return
	}

	// Find where token ends (after newline)
	tokenEnd := findTokenEnd(buffer[:n])
	if tokenEnd < 0 {
		conn.Write([]byte("ERROR: Invalid token format\n"))
		return
	}

	// Check for MAPPING header after token
	var mappingId string
	var dataStart int = tokenEnd
	if tokenEnd < n {
		// Try to extract MAPPING header (format: "MAPPING:<mappingId>\n")
		remainingAfterToken := buffer[tokenEnd:n]
		mappingId = extractMapping(remainingAfterToken)
		if mappingId != "" {
			// Find where MAPPING header ends
			mappingEnd := findMappingEnd(remainingAfterToken)
			if mappingEnd > 0 {
				dataStart = tokenEnd + mappingEnd
			}
		} else {
			// Even if mappingId is empty, check if MAPPING: prefix exists and skip it
			// This handles cases where mappingId might be empty or incomplete
			if len(remainingAfterToken) >= 8 && string(remainingAfterToken[:8]) == "MAPPING:" {
				// Skip MAPPING: prefix even if we can't extract the ID
				// Find newline after MAPPING:
				foundNewline := false
				for i := 8; i < len(remainingAfterToken); i++ {
					if remainingAfterToken[i] == '\n' {
						dataStart = tokenEnd + i + 1
						foundNewline = true
						break
					}
				}
				// If no newline found in buffer, skip all remaining data in buffer
				// The SOCKS5 request will come in subsequent reads
				if !foundNewline {
					dataStart = n // Skip all remaining data in buffer
				}
			}
		}
	}

	// Create buffered connection with remaining data (SOCKS5 request may be in buffer)
	remainingData := buffer[dataStart:n]
	log.Printf("[Gateway] Token extracted, mappingId: %s, remaining data in buffer: %d bytes: %x", mappingId, len(remainingData), remainingData)
	bufferedConn := newBufferedConn(conn, remainingData)

	// Validate token
	userInfo, err := authValidator.Validate(token)
	if err != nil {
		conn.Write([]byte("ERROR: Invalid token\n"))
		return
	}

	// Check quota (async check, don't block if check fails)
	hasQuota, err := trafficCounter.CheckQuota(userInfo.UserID)
	if err == nil && !hasQuota {
		conn.Write([]byte("ERROR: Quota exceeded\n"))
		return
	}

	// Select proxy based on mappingId (if provided) or use rotation mode
	var proxyInfo *proxy.ProxyInfo
	if mappingId != "" {
		// Port forward mode: use mappingId to get fixed upstream proxy
		proxyInfo, err = proxySelector.SelectProxyByMappingId(mappingId, token)
		if err != nil {
			log.Printf("[Gateway] Failed to get proxy by mappingId %s: %v", mappingId, err)
			conn.Write([]byte("ERROR: Failed to get proxy from mapping\n"))
			return
		}
		log.Printf("[Gateway] Using proxy from mappingId %s: %s:%d", mappingId, proxyInfo.Host, proxyInfo.Port)
	} else {
		// Rotation mode: select proxy from pool (for website service)
		proxyInfo, err = proxySelector.SelectProxy(token, userInfo.UserID)
		if err != nil {
			conn.Write([]byte("ERROR: No proxy available\n"))
			return
		}
	}

	// Create tunnel using buffered connection
	err = proxy.CreateTunnel(bufferedConn, proxyInfo, trafficCounter, userInfo.UserID)
	if err != nil {
		log.Printf("Tunnel error: %v", err)
	}
}

func extractToken(data []byte) string {
	// Simple token extraction - expect format "TOKEN:<token>\n"
	prefix := []byte("TOKEN:")
	if len(data) < len(prefix) {
		return ""
	}

	if string(data[:len(prefix)]) != "TOKEN:" {
		return ""
	}

	// Find newline
	for i := len(prefix); i < len(data); i++ {
		if data[i] == '\n' {
			return string(data[len(prefix):i])
		}
	}

	return string(data[len(prefix):])
}

func findTokenEnd(data []byte) int {
	// Find the position after the newline following the token
	prefix := []byte("TOKEN:")
	if len(data) < len(prefix) {
		return -1
	}

	if string(data[:len(prefix)]) != "TOKEN:" {
		return -1
	}

	// Find newline after token
	for i := len(prefix); i < len(data); i++ {
		if data[i] == '\n' {
			return i + 1 // Return position after newline
		}
	}

	// No newline found, token continues to end of buffer
	return len(data)
}

func extractMapping(data []byte) string {
	// Extract MAPPING header (format: "MAPPING:<mappingId>\n")
	prefix := []byte("MAPPING:")
	if len(data) < len(prefix) {
		return ""
	}

	if string(data[:len(prefix)]) != "MAPPING:" {
		return ""
	}

	// Find newline
	for i := len(prefix); i < len(data); i++ {
		if data[i] == '\n' {
			return string(data[len(prefix):i])
		}
	}

	return string(data[len(prefix):])
}

func findMappingEnd(data []byte) int {
	// Find the position after the newline following the MAPPING header
	prefix := []byte("MAPPING:")
	if len(data) < len(prefix) {
		return -1
	}

	if string(data[:len(prefix)]) != "MAPPING:" {
		return -1
	}

	// Find newline after mappingId
	for i := len(prefix); i < len(data); i++ {
		if data[i] == '\n' {
			return i + 1 // Return position after newline
		}
	}

	// No newline found, mappingId continues to end of buffer
	return len(data)
}
