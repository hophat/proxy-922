package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"Proxy96-gateway/internal/session"
)

type UserInfo struct {
	UserID string
	Email  string
}

type Validator struct {
	backendURL   string
	sessionStore session.Store
	httpClient   *http.Client
}

func NewValidator(backendURL string, sessionStore session.Store) *Validator {
	return &Validator{
		backendURL:   backendURL,
		sessionStore: sessionStore,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (v *Validator) Validate(token string) (*UserInfo, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("token:%s", token)
	cachedUserID, err := v.sessionStore.GetSession(cacheKey)
	if err == nil && cachedUserID != "" {
		// Token is cached and valid
		return &UserInfo{
			UserID: cachedUserID,
			Email:  "", // Email not cached for performance
		}, nil
	}

	// Validate with backend API
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/auth/check-token", v.backendURL), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid token")
	}

	var result struct {
		Valid  bool   `json:"valid"`
		UserID string `json:"userId"`
		Email  string `json:"email"`
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if !result.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Cache token validation (TTL: 5 minutes)
	v.sessionStore.SetSession(cacheKey, result.UserID, 300)

	return &UserInfo{
		UserID: result.UserID,
		Email:  result.Email,
	}, nil
}

func (v *Validator) CheckQuota(userID string) (bool, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/usage/users/%s/quota", v.backendURL, userID), nil)
	if err != nil {
		return false, err
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check quota")
	}

	var result struct {
		HasQuota bool `json:"hasQuota"`
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	return result.HasQuota, nil
}
