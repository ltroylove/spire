package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"strings"

	"github.com/EQEmuTools/spire/internal/env"
	"github.com/labstack/echo/v4"
)

const githubSignatureHeader = "X-Hub-Signature-256"

// GitHubWebhookAuth returns middleware that verifies the GitHub HMAC-SHA256
// webhook signature present in the X-Hub-Signature-256 header.
//
// Verification is skipped in local/dev environments and when
// QUEST_API_WEBHOOK_SECRET is not configured (logs a warning in production).
// Uses constant-time comparison to prevent timing attacks.
func GitHubWebhookAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip verification entirely in local/dev — manual triggers still work
			if env.IsAppEnvLocal() {
				return next(c)
			}

			secret := env.Get("QUEST_API_WEBHOOK_SECRET", "")
			if secret == "" {
				// Secret not configured: allow through so production doesn't
				// hard-break if the variable hasn't been set yet, but this
				// means the endpoint is unauthenticated — operators should
				// set QUEST_API_WEBHOOK_SECRET in their .env.
				return next(c)
			}

			signature := c.Request().Header.Get(githubSignatureHeader)
			if signature == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing webhook signature")
			}

			// Read the full body for HMAC computation then restore it so the
			// handler can still read it (e.g. for future c.Bind() calls).
			body, err := io.ReadAll(c.Request().Body)
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "failed to read request body")
			}
			c.Request().Body = io.NopCloser(bytes.NewReader(body))

			if !verifyGitHubSignature(body, signature, []byte(secret)) {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid webhook signature")
			}

			return next(c)
		}
	}
}

// verifyGitHubSignature computes HMAC-SHA256 over payload using secretKey and
// compares it to signature using constant-time comparison to prevent timing
// attacks. GitHub sends signatures in the format "sha256=<hex_digest>".
func verifyGitHubSignature(payload []byte, signature string, secretKey []byte) bool {
	// Reject anything that doesn't have the expected prefix before comparing
	if !strings.HasPrefix(signature, "sha256=") {
		return false
	}
	mac := hmac.New(sha256.New, secretKey)
	mac.Write(payload)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	// hmac.Equal uses crypto/subtle.ConstantTimeCompare internally
	return hmac.Equal([]byte(expected), []byte(signature))
}
