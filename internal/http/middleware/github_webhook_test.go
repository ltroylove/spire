package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// computeTestSignature produces a GitHub-format HMAC-SHA256 signature for use
// in tests. Mirrors the logic in verifyGitHubSignature so tests stay honest.
func computeTestSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// ---------------------------------------------------------------------------
// Unit tests — verifyGitHubSignature
// ---------------------------------------------------------------------------

func TestVerifyGitHubSignature(t *testing.T) {
	secret := "supersecret"
	payload := []byte(`{"ref":"refs/heads/main"}`)
	validSig := computeTestSignature(payload, secret)

	// Tamper the payload by flipping one byte
	tampered := make([]byte, len(payload))
	copy(tampered, payload)
	tampered[0] ^= 0x01

	cases := []struct {
		name      string
		payload   []byte
		signature string
		secret    string
		want      bool
	}{
		{
			name:      "valid signature",
			payload:   payload,
			signature: validSig,
			secret:    secret,
			want:      true,
		},
		{
			name:      "tampered payload",
			payload:   tampered,
			signature: validSig,
			secret:    secret,
			want:      false,
		},
		{
			name:      "wrong secret",
			payload:   payload,
			signature: validSig,
			secret:    "wrongsecret",
			want:      false,
		},
		{
			name:      "missing sha256= prefix",
			payload:   payload,
			signature: hex.EncodeToString([]byte("noprefixhex")),
			secret:    secret,
			want:      false,
		},
		{
			name:      "correct prefix but wrong hex digest",
			payload:   payload,
			signature: "sha256=0000000000000000000000000000000000000000000000000000000000000000",
			secret:    secret,
			want:      false,
		},
		{
			name:      "empty signature string",
			payload:   payload,
			signature: "",
			secret:    secret,
			want:      false,
		},
		{
			name:      "empty payload produces valid HMAC",
			payload:   []byte{},
			signature: computeTestSignature([]byte{}, secret),
			secret:    secret,
			want:      true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := verifyGitHubSignature(tc.payload, tc.signature, []byte(tc.secret))
			assert.Equal(t, tc.want, got)
		})
	}
}

// ---------------------------------------------------------------------------
// Middleware integration tests — GitHubWebhookAuth
// ---------------------------------------------------------------------------

// newTestEcho creates a minimal Echo instance with a POST /webhook route
// protected by GitHubWebhookAuth. The handler writes the request body back
// in the response so tests can confirm the body is still readable after the
// middleware runs.
func newTestEcho() *echo.Echo {
	e := echo.New()
	e.POST("/webhook", func(c echo.Context) error {
		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return c.String(http.StatusInternalServerError, "body read error")
		}
		return c.String(http.StatusOK, string(body))
	}, GitHubWebhookAuth())
	return e
}

func doRequest(e *echo.Echo, payload []byte, sigHeader string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(payload))
	req.Header.Set(echo.MIMEApplicationJSON, "application/json")
	if sigHeader != "" {
		req.Header.Set(githubSignatureHeader, sigHeader)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func TestGitHubWebhookAuthMiddleware(t *testing.T) {
	const secret = "testsecret"
	payload := []byte(`{"ref":"refs/heads/main"}`)
	validSig := computeTestSignature(payload, secret)

	cases := []struct {
		name           string
		appEnv         string
		webhookSecret  string
		signature      string
		wantStatus     int
		wantBodyContains string
	}{
		{
			name:          "local env skips verification entirely",
			appEnv:        "local",
			webhookSecret: "",
			signature:     "",
			wantStatus:    http.StatusOK,
		},
		{
			name:          "dev env skips verification (treated as local)",
			appEnv:        "dev",
			webhookSecret: "",
			signature:     "",
			wantStatus:    http.StatusOK,
		},
		{
			name:          "production with no secret configured allows through",
			appEnv:        "production",
			webhookSecret: "",
			signature:     "",
			wantStatus:    http.StatusOK,
		},
		{
			name:          "production with valid signature returns 200",
			appEnv:        "production",
			webhookSecret: secret,
			signature:     validSig,
			wantStatus:    http.StatusOK,
		},
		{
			name:          "production with missing signature header returns 401",
			appEnv:        "production",
			webhookSecret: secret,
			signature:     "",
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "production with wrong signature returns 401",
			appEnv:        "production",
			webhookSecret: secret,
			signature:     "sha256=0000000000000000000000000000000000000000000000000000000000000000",
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "production with malformed signature (no prefix) returns 401",
			appEnv:        "production",
			webhookSecret: secret,
			signature:     hex.EncodeToString([]byte("noprefixvalue")),
			wantStatus:    http.StatusUnauthorized,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("APP_ENV", tc.appEnv)
			t.Setenv("QUEST_API_WEBHOOK_SECRET", tc.webhookSecret)

			rec := doRequest(newTestEcho(), payload, tc.signature)
			assert.Equal(t, tc.wantStatus, rec.Code, "unexpected status for case: %s", tc.name)
		})
	}
}

// TestGitHubWebhookAuthBodyRestoredForHandler confirms that after the
// middleware reads the body for HMAC computation it restores it so the
// downstream handler can still read it — critical for future c.Bind() calls.
func TestGitHubWebhookAuthBodyRestoredForHandler(t *testing.T) {
	const secret = "testsecret"
	payload := []byte(`{"ref":"refs/heads/main"}`)

	t.Setenv("APP_ENV", "production")
	t.Setenv("QUEST_API_WEBHOOK_SECRET", secret)

	rec := doRequest(newTestEcho(), payload, computeTestSignature(payload, secret))

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, string(payload), rec.Body.String(), "handler did not receive the original body")
}
