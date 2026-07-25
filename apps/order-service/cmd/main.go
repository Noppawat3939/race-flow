package main

import (
	"context"
	"log"
	"time"

	"github.com/Noppawat3939/race-flow/apps/order-service/internal/config"
	"github.com/Noppawat3939/race-flow/apps/order-service/internal/reservation"
	"github.com/Noppawat3939/race-flow/apps/order-service/internal/stream"
)

func main() {
	cfg := config.Load()

	client := stream.NewClient(cfg.RedisAddr)
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		log.Printf("order-service: redis not reachable at %s: %v", cfg.RedisAddr, err)
	} else {
		log.Printf("order-service: connected to redis at %s", cfg.RedisAddr)
	}

	_ = reservation.NewMemoryStore()

	log.Printf("order-service: scaffolded, consumer group %q on %q (business logic not yet implemented)",
		cfg.ConsumerGroup, cfg.CommandsStream)
}
