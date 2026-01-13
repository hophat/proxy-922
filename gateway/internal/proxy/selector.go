package proxy

import (
	"Proxy96-gateway/internal/session"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
)

type ProxyInfo struct {
	ID       string
	Host     string
	Port     int
	Username string
	Password string
}

type Selector struct {
	backendURL   string
	sessionStore session.Store
	stickyTTL    int
	httpClient   *http.Client
}

func NewSelector(backendURL string, sessionStore session.Store, stickyTTL int) *Selector {
	return &Selector{
		backendURL:   backendURL,
		sessionStore: sessionStore,
		stickyTTL:    stickyTTL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *Selector) SelectProxy(token string, userID string) (*ProxyInfo, error) {
	// Check for sticky session
	sessionKey := fmt.Sprintf("session:%s", token)
	cachedProxyID, err := s.sessionStore.GetSession(sessionKey)
	if err == nil && cachedProxyID != "" {
		// Use cached proxy (sticky mode)
		proxy, err := s.getProxyByID(cachedProxyID, token)
		if err == nil && proxy != nil {
			return proxy, nil
		}
		// If cached proxy is invalid, fall through to rotate
	}

	// Rotate mode: get active proxies and select one
	proxies, err := s.getActiveProxies(token)
	if err != nil {
		return nil, err
	}

	if len(proxies) == 0 {
		return nil, fmt.Errorf("no active proxies available")
	}

	// Random selection for load balancing
	rand.Seed(time.Now().UnixNano())
	selectedProxy := proxies[rand.Intn(len(proxies))]

	// Store in session for sticky mode
	s.sessionStore.SetSession(sessionKey, selectedProxy.ID, s.stickyTTL)

	return selectedProxy, nil
}

func (s *Selector) SelectProxyByMappingId(mappingId string, token string) (*ProxyInfo, error) {
	// Query backend API to get upstream proxy from mappingId
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/port-mappings/%s/upstream", s.backendURL, mappingId), nil)
	if err != nil {
		return nil, err
	}

	// Add authentication token
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get upstream from mapping: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var upstream struct {
		ID       string `json:"id"`
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.Unmarshal(body, &upstream); err != nil {
		return nil, err
	}

	return &ProxyInfo{
		ID:       upstream.ID,
		Host:     upstream.Host,
		Port:     upstream.Port,
		Username: upstream.Username,
		Password: upstream.Password,
	}, nil
}

func (s *Selector) getActiveProxies(token string) ([]*ProxyInfo, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/proxies/active", s.backendURL), nil)
	if err != nil {
		return nil, err
	}

	// Add authentication token
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get proxies: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var proxies []struct {
		ID                string `json:"id"`
		Host              string `json:"host"`
		Port              int    `json:"port"`
		Username          string `json:"username"`
		PasswordEncrypted string `json:"passwordEncrypted"`
	}

	if err := json.Unmarshal(body, &proxies); err != nil {
		return nil, err
	}

	result := make([]*ProxyInfo, 0, len(proxies))
	for _, p := range proxies {
		// Decrypt password if available
		password := ""
		if p.PasswordEncrypted != "" {
			decrypted, err := decryptPassword(p.PasswordEncrypted)
			if err != nil {
				// Log error but continue - password might not be needed
				fmt.Printf("Warning: Failed to decrypt password for proxy %s:%d: %v\n", p.Host, p.Port, err)
			} else {
				password = decrypted
			}
		}

		result = append(result, &ProxyInfo{
			ID:       p.ID,
			Host:     p.Host,
			Port:     p.Port,
			Username: p.Username,
			Password: password,
		})
	}

	return result, nil
}

func (s *Selector) getProxyByID(proxyID string, token string) (*ProxyInfo, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/proxies/%s", s.backendURL, proxyID), nil)
	if err != nil {
		return nil, err
	}

	// Add authentication token
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("proxy not found")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var proxy struct {
		ID                string `json:"id"`
		Host              string `json:"host"`
		Port              int    `json:"port"`
		Username          string `json:"username"`
		PasswordEncrypted string `json:"passwordEncrypted"`
	}

	if err := json.Unmarshal(body, &proxy); err != nil {
		return nil, err
	}

	// Decrypt password if available
	password := ""
	if proxy.PasswordEncrypted != "" {
		decrypted, err := decryptPassword(proxy.PasswordEncrypted)
		if err == nil {
			password = decrypted
		}
	}

	return &ProxyInfo{
		ID:       proxy.ID,
		Host:     proxy.Host,
		Port:     proxy.Port,
		Username: proxy.Username,
		Password: password,
	}, nil
}

// decryptPassword decrypts password using AES-256-CBC
func decryptPassword(encrypted string) (string, error) {
	// Get encryption key from environment
	keyString := os.Getenv("ENCRYPTION_KEY")
	if keyString == "" {
		keyString = "default-key-32-chars-long!!"
	}

	// Ensure key is exactly 32 bytes for AES-256
	if len(keyString) < 32 {
		// Pad with default string
		keyString = keyString + strings.Repeat("!", 32-len(keyString))
	} else if len(keyString) > 32 {
		// Truncate to 32 bytes
		keyString = keyString[:32]
	}

	key := []byte(keyString)

	// Split IV and encrypted text
	parts := strings.Split(encrypted, ":")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid encrypted format")
	}

	iv, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", err
	}

	encryptedText, err := hex.DecodeString(parts[1])
	if err != nil {
		return "", err
	}

	// Create cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Create decryptor
	stream := cipher.NewCBCDecrypter(block, iv)

	// Decrypt
	decrypted := make([]byte, len(encryptedText))
	stream.CryptBlocks(decrypted, encryptedText)

	// Remove padding (PKCS7)
	if len(decrypted) == 0 {
		return "", fmt.Errorf("empty decrypted data")
	}

	padding := int(decrypted[len(decrypted)-1])
	if padding == 0 || padding > len(decrypted) || padding > 16 {
		return "", fmt.Errorf("invalid padding: %d (data length: %d)", padding, len(decrypted))
	}

	// Verify padding bytes are all the same
	for i := len(decrypted) - padding; i < len(decrypted); i++ {
		if decrypted[i] != byte(padding) {
			return "", fmt.Errorf("invalid padding: byte at position %d is %d, expected %d", i, decrypted[i], padding)
		}
	}

	return string(decrypted[:len(decrypted)-padding]), nil
}
