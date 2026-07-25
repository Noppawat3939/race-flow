// Package reservation implements atomic race-slot reservation — the
// concurrency-heavy piece this service exists to practice.
package reservation

import (
	"context"
	"errors"
)

var ErrNotImplemented = errors.New("reservation: not implemented yet")

// Store reserves and releases race slots atomically and idempotently by
// commandId. TODO: implement so slot count never goes negative or
// over-allocates under concurrent ReserveSlot/ReleaseSlot commands, proven
// with a concurrency test (roadmap item: order-service).
type Store interface {
	Reserve(ctx context.Context, raceID, userID, commandID string) (slotID string, err error)
	Release(ctx context.Context, raceID, userID, commandID string) error
}

type memoryStore struct{}

// NewMemoryStore returns an in-memory Store scaffold. Not yet safe for
// concurrent use — that's the core implementation task for this service.
func NewMemoryStore() Store {
	return &memoryStore{}
}

func (s *memoryStore) Reserve(ctx context.Context, raceID, userID, commandID string) (string, error) {
	return "", ErrNotImplemented
}

func (s *memoryStore) Release(ctx context.Context, raceID, userID, commandID string) error {
	return ErrNotImplemented
}
