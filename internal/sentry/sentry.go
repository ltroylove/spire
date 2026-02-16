package sentry

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/getsentry/sentry-go"
)

// Init initializes Sentry if SENTRY_DSN is set. Returns nil if DSN is empty (disabled).
func Init() error {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		return nil
	}

	environment := os.Getenv("SENTRY_ENVIRONMENT")
	if environment == "" {
		environment = "production"
	}

	tracesSampleRate := 0.2
	if v := os.Getenv("SENTRY_TRACES_SAMPLE_RATE"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			tracesSampleRate = parsed
		}
	}

	debug := false
	if v := os.Getenv("SENTRY_DEBUG"); v == "true" || v == "1" {
		debug = true
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      environment,
		TracesSampleRate: tracesSampleRate,
		Debug:            debug,
	})
	if err != nil {
		return fmt.Errorf("sentry init: %w", err)
	}

	return nil
}

// Flush flushes buffered Sentry events. Call before app shutdown.
func Flush() {
	if IsEnabled() {
		sentry.Flush(2 * time.Second)
	}
}

// IsEnabled returns true if Sentry has been initialized (DSN was set).
func IsEnabled() bool {
	return sentry.CurrentHub().Client() != nil
}
