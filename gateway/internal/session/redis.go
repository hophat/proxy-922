package session

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type Store interface {
	SetSession(token string, proxyID string, ttl int) error
	GetSession(token string) (string, error)
	DeleteSession(token string) error
}

type RedisStore struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisStore(host string, port int, password string) *RedisStore {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", host, port),
		Password: password,
		DB:       0,
	})

	ctx := context.Background()

	// Test connection
	_, err := client.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Failed to connect to Redis: %v", err))
	}

	return &RedisStore{
		client: client,
		ctx:    ctx,
	}
}

func (r *RedisStore) SetSession(token string, proxyID string, ttl int) error {
	key := fmt.Sprintf("session:%s", token)
	return r.client.Set(r.ctx, key, proxyID, time.Duration(ttl)*time.Second).Err()
}

func (r *RedisStore) GetSession(token string) (string, error) {
	key := fmt.Sprintf("session:%s", token)
	result, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	return result, err
}

func (r *RedisStore) DeleteSession(token string) error {
	key := fmt.Sprintf("session:%s", token)
	return r.client.Del(r.ctx, key).Err()
}

