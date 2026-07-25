package config

import "os"

type Config struct {
	RedisAddr      string
	ConsumerGroup  string
	CommandsStream string
	EventsStream   string
}

func Load() Config {
	return Config{
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		ConsumerGroup:  getEnv("CONSUMER_GROUP", "order-service-group"),
		CommandsStream: getEnv("COMMANDS_STREAM", "order-service.commands"),
		EventsStream:   getEnv("EVENTS_STREAM", "saga.events"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
