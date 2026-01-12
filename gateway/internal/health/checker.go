package health

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"proxy992-gateway/internal/config"
)

type Checker struct {
	backendURL     string
	httpClient     *http.Client
	checkInterval  int
	ticker         *time.Ticker
	stopChan       chan bool
}

type Proxy struct {
	ID       string `json:"id"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewChecker(cfg *config.Config) *Checker {
	checker := &Checker{
		backendURL:    cfg.BackendAPIURL,
		checkInterval: cfg.HealthCheckInterval,
		httpClient: &http.Client{
			Timeout: 3 * time.Second, // Health check timeout
		},
		ticker:   time.NewTicker(time.Duration(cfg.HealthCheckInterval) * time.Second),
		stopChan: make(chan bool),
	}

	go checker.run()

	return checker
}

func (c *Checker) run() {
	// Initial check
	c.checkAllProxies()

	for {
		select {
		case <-c.ticker.C:
			c.checkAllProxies()
		case <-c.stopChan:
			return
		}
	}
}

func (c *Checker) checkAllProxies() {
	proxies, err := c.getProxies()
	if err != nil {
		return
	}

	for _, proxy := range proxies {
		go c.checkProxy(proxy)
	}
}

func (c *Checker) getProxies() ([]Proxy, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/proxies", c.backendURL), nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get proxies")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var proxies []struct {
		ID       string `json:"id"`
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Username string `json:"username"`
	}

	if err := json.Unmarshal(body, &proxies); err != nil {
		return nil, err
	}

	result := make([]Proxy, 0, len(proxies))
	for _, p := range proxies {
		result = append(result, Proxy{
			ID:       p.ID,
			Host:     p.Host,
			Port:     p.Port,
			Username: p.Username,
		})
	}

	return result, nil
}

func (c *Checker) checkProxy(proxy Proxy) {
	isAlive := c.testProxy(proxy)
	c.updateProxyStatus(proxy.ID, isAlive)
}

func (c *Checker) testProxy(proxy Proxy) bool {
	// Connect to SOCKS5 proxy
	proxyAddr := fmt.Sprintf("%s:%d", proxy.Host, proxy.Port)
	conn, err := net.DialTimeout("tcp", proxyAddr, 3*time.Second)
	if err != nil {
		return false
	}
	defer conn.Close()

	// Perform SOCKS5 handshake
	if err := c.socks5Handshake(conn, proxy.Username, ""); err != nil {
		return false
	}

	// Test connection to httpbin.org/ip
	testHost := "httpbin.org"
	testPort := 80

	// Send CONNECT request
	request := make([]byte, 0, 10)
	request = append(request, 0x05) // SOCKS5
	request = append(request, 0x01) // CONNECT
	request = append(request, 0x00) // Reserved
	request = append(request, 0x03) // Domain name
	request = append(request, byte(len(testHost)))
	request = append(request, []byte(testHost)...)
	request = append(request, byte(testPort>>8))
	request = append(request, byte(testPort&0xFF))

	if _, err := conn.Write(request); err != nil {
		return false
	}

	// Read response
	response := make([]byte, 10)
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	if _, err := io.ReadFull(conn, response); err != nil {
		return false
	}

	if response[1] != 0x00 {
		return false
	}

	// Try to make HTTP request through proxy
	httpReq, _ := http.NewRequest("GET", "http://httpbin.org/ip", nil)
	httpClient := &http.Client{
		Transport: &http.Transport{
			Dial: func(network, addr string) (net.Conn, error) {
				return conn, nil
			},
		},
		Timeout: 3 * time.Second,
	}

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (c *Checker) socks5Handshake(conn net.Conn, username, password string) error {
	// Send greeting
	greeting := []byte{0x05, 0x01, 0x00} // SOCKS5, 1 method, no auth
	if username != "" {
		greeting = []byte{0x05, 0x01, 0x02} // Username/password auth
	}

	if _, err := conn.Write(greeting); err != nil {
		return err
	}

	// Read server response
	response := make([]byte, 2)
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	if _, err := io.ReadFull(conn, response); err != nil {
		return err
	}

	if response[0] != 0x05 {
		return fmt.Errorf("invalid SOCKS version")
	}

	// If username/password auth required
	if response[1] == 0x02 && username != "" {
		auth := make([]byte, 0, 3+len(username)+len(password))
		auth = append(auth, 0x01) // Version
		auth = append(auth, byte(len(username)))
		auth = append(auth, []byte(username)...)
		auth = append(auth, byte(len(password)))
		auth = append(auth, []byte(password)...)

		if _, err := conn.Write(auth); err != nil {
			return err
		}

		authResponse := make([]byte, 2)
		conn.SetReadDeadline(time.Now().Add(3 * time.Second))
		if _, err := io.ReadFull(conn, authResponse); err != nil {
			return err
		}

		if authResponse[1] != 0x00 {
			return fmt.Errorf("authentication failed")
		}
	}

	return nil
}

func (c *Checker) updateProxyStatus(proxyID string, isAlive bool) {
	payload := map[string]interface{}{
		"proxyId":  proxyID,
		"isAlive":  isAlive,
		"lastCheck": time.Now().Format(time.RFC3339),
	}

	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", fmt.Sprintf("%s/proxies/%s/health", c.backendURL, proxyID), strings.NewReader(string(jsonData)))
	req.Header.Set("Content-Type", "application/json")

	// Fire and forget
	go func() {
		c.httpClient.Do(req)
	}()
}

func (c *Checker) Stop() {
	c.ticker.Stop()
	c.stopChan <- true
}

