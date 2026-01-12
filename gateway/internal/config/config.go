package config

import (
	"os"
	"strconv"
)

type Config struct {
	GatewayPort        int
	BackendAPIURL      string
	RedisHost          string
	RedisPort          int
	RedisPassword      string
	TLSCertPath        string
	TLSKeyPath         string
	StickyTTL         int
	HealthCheckInterval int
}

func Load() *Config {
	gatewayPort, _ := strconv.Atoi(getEnv("GATEWAY_PORT", "8080"))
	redisPort, _ := strconv.Atoi(getEnv("REDIS_PORT", "6379"))
	stickyTTL, _ := strconv.Atoi(getEnv("STICKY_TTL", "900"))
	healthCheckInterval, _ := strconv.Atoi(getEnv("HEALTH_CHECK_INTERVAL", "45"))

	return &Config{
		GatewayPort:        gatewayPort,
		BackendAPIURL:      getEnv("BACKEND_API_URL", "http://localhost:3300"),
		RedisHost:          getEnv("REDIS_HOST", "localhost"),
		RedisPort:          redisPort,
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		TLSCertPath:        getEnv("TLS_CERT_PATH", "./certs/cert.pem"),
		TLSKeyPath:         getEnv("TLS_KEY_PATH", "./certs/key.pem"),
		StickyTTL:          stickyTTL,
		HealthCheckInterval: healthCheckInterval,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

