// Package stream implements the Redis Streams producer/consumer described in
// docs/queue-protocol.md — the shared wire contract every service talks over.
package stream

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

// Command mirrors the command envelope in docs/queue-protocol.md.
type Command struct {
	CommandID string                 `json:"commandId"`
	Command   string                 `json:"command"`
	SagaID    string                 `json:"sagaId"`
	IssuedAt  time.Time              `json:"issuedAt"`
	Version   string                 `json:"version"`
	Payload   map[string]interface{} `json:"payload"`
}

// Event mirrors the event envelope in docs/queue-protocol.md.
type Event struct {
	EventID    string                 `json:"eventId"`
	Type       string                 `json:"type"`
	SagaID     string                 `json:"sagaId"`
	OccurredAt time.Time              `json:"occurredAt"`
	Version    string                 `json:"version"`
	Payload    map[string]interface{} `json:"payload"`
}

var ErrNotImplemented = errors.New("stream: not implemented yet")

type Client struct {
	rdb *redis.Client
}

func NewClient(addr string) *Client {
	return &Client{rdb: redis.NewClient(&redis.Options{Addr: addr})}
}

func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

// Publish appends an event onto streamName via XADD.
// TODO: implement order.reserved / order.reservation-failed / order.released
// publishing (roadmap item: order-service).
func (c *Client) Publish(ctx context.Context, streamName string, event Event) error {
	return ErrNotImplemented
}

// Consume reads pending commands for the consumer group via XREADGROUP.
// TODO: implement ReserveSlot/ReleaseSlot consumption with retry and
// dead-letter handling per docs/queue-protocol.md (roadmap item: order-service).
func (c *Client) Consume(ctx context.Context, streamName, group, consumer string) ([]Command, error) {
	return nil, ErrNotImplemented
}
