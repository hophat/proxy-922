package traffic

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Counter struct {
	backendURL string
	httpClient *http.Client
	mu         sync.Mutex
	pending    map[string]int64 // userID -> bytes
	ticker     *time.Ticker
	stopChan   chan bool
}

func NewCounter(backendURL string) *Counter {
	counter := &Counter{
		backendURL: backendURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		pending:  make(map[string]int64),
		ticker:   time.NewTicker(5 * time.Second), // Sync every 5 seconds
		stopChan: make(chan bool),
	}

	// Start background sync
	go counter.syncLoop()

	return counter
}

func (c *Counter) AddTraffic(userID string, bytes int64, isUpload bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.pending[userID] += bytes
}

func (c *Counter) CheckQuota(userID string) (bool, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/usage/users/%s/quota", c.backendURL, userID), nil)
	if err != nil {
		return false, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check quota")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	var result struct {
		HasQuota bool `json:"hasQuota"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	return result.HasQuota, nil
}

func (c *Counter) syncLoop() {
	for {
		select {
		case <-c.ticker.C:
			c.sync()
		case <-c.stopChan:
			return
		}
	}
}

func (c *Counter) sync() {
	c.mu.Lock()
	if len(c.pending) == 0 {
		c.mu.Unlock()
		return
	}

	// Copy pending traffic
	pendingCopy := make(map[string]int64)
	for userID, bytes := range c.pending {
		pendingCopy[userID] = bytes
	}
	c.pending = make(map[string]int64) // Clear pending
	c.mu.Unlock()

	// Sync each user's traffic
	for userID, bytes := range pendingCopy {
		if bytes > 0 {
			c.syncUserTraffic(userID, bytes)
		}
	}
}

func (c *Counter) syncUserTraffic(userID string, bytes int64) {
	payload := map[string]interface{}{
		"userId": userID,
		"bytes":  bytes,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/usage", c.backendURL), strings.NewReader(string(jsonData)))
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Re-add to pending if sync failed
		c.mu.Lock()
		c.pending[userID] += bytes
		c.mu.Unlock()
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Re-add to pending if sync failed
		c.mu.Lock()
		c.pending[userID] += bytes
		c.mu.Unlock()
		return
	}

	// Check if quota was exceeded
	var result struct {
		Success      bool `json:"success"`
		QuotaExceeded bool `json:"quotaExceeded"`
	}

	body, err := io.ReadAll(resp.Body)
	if err == nil {
		json.Unmarshal(body, &result)
		if result.QuotaExceeded {
			// Quota exceeded - connection should be dropped
			// This will be handled by the connection handler
		}
	}
}

func (c *Counter) Stop() {
	c.ticker.Stop()
	c.stopChan <- true
	// Final sync
	c.sync()
}

