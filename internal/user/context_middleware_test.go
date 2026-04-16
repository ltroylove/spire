package user

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// buildSignedToken creates a signed jwtCustomClaims token for test use.
func buildSignedToken(t *testing.T, secret, userId string, authorized bool, exp time.Time) string {
	t.Helper()
	claims := &jwtCustomClaims{
		Authorized: authorized,
		UserId:     userId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return signed
}

// newTestMiddleware returns a ContextMiddleware with nil DB/cache — sufficient for
// exercising the JWT validation layer (skippers + signature/expiry checks). Tests that
// reach successHandler require a real DB and belong in integration tests.
func newTestMiddleware() *ContextMiddleware {
	return &ContextMiddleware{}
}

// newEchoHeader builds a minimal Echo instance with HandleHeader middleware applied.
func newEchoHeader(m *ContextMiddleware) *echo.Echo {
	e := echo.New()
	e.Use(m.HandleHeader())
	e.GET("/test", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	return e
}

// newEchoQuery builds a minimal Echo instance with HandleQuerystring middleware applied.
func newEchoQuery(m *ContextMiddleware) *echo.Echo {
	e := echo.New()
	e.Use(m.HandleQuerystring())
	e.GET("/test", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	return e
}

// ---------------------------------------------------------------------------
// HandleHeader — skipper tests
// ---------------------------------------------------------------------------

func TestHandleHeader_SkipsWhenNoAuthorizationHeader(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	e := newEchoHeader(newTestMiddleware())

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "no Authorization header should skip JWT check")
}

func TestHandleHeader_SkipsWhenBasicAuth(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	e := newEchoHeader(newTestMiddleware())

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "Basic auth header should bypass JWT validation")
}

// ---------------------------------------------------------------------------
// HandleHeader — rejection tests
// ---------------------------------------------------------------------------

func TestHandleHeader_RejectsMalformedToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	e := newEchoHeader(newTestMiddleware())

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer this.is.not.a.real.jwt")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "malformed token should be rejected")
}

func TestHandleHeader_RejectsTokenSignedWithWrongKey(t *testing.T) {
	const validSecret = "correctsecret"
	t.Setenv("JWT_SECRET_KEY", validSecret)
	e := newEchoHeader(newTestMiddleware())

	// Token signed with a different key
	token := buildSignedToken(t, "wrongsecret", "1", true, time.Now().Add(time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "token signed with wrong key should be rejected")
}

func TestHandleHeader_RejectsExpiredToken(t *testing.T) {
	const secret = "testsecret"
	t.Setenv("JWT_SECRET_KEY", secret)
	e := newEchoHeader(newTestMiddleware())

	// Token expired 1 hour ago
	token := buildSignedToken(t, secret, "1", true, time.Now().Add(-time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "expired token should be rejected")
}

// ---------------------------------------------------------------------------
// HandleQuerystring — skipper tests
// ---------------------------------------------------------------------------

func TestHandleQuerystring_SkipsWhenNoJwtParam(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	e := newEchoQuery(newTestMiddleware())

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "missing jwt query param should skip JWT validation")
}

// ---------------------------------------------------------------------------
// HandleQuerystring — rejection tests
// ---------------------------------------------------------------------------

func TestHandleQuerystring_RejectsMalformedToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	e := newEchoQuery(newTestMiddleware())

	req := httptest.NewRequest(http.MethodGet, "/test?jwt=not.a.real.token", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "malformed query-string token should be rejected")
}

func TestHandleQuerystring_RejectsTokenSignedWithWrongKey(t *testing.T) {
	const validSecret = "correctsecret"
	t.Setenv("JWT_SECRET_KEY", validSecret)
	e := newEchoQuery(newTestMiddleware())

	token := buildSignedToken(t, "wrongsecret", "1", true, time.Now().Add(time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/test?jwt="+token, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "wrong-key query-string token should be rejected")
}

func TestHandleQuerystring_RejectsExpiredToken(t *testing.T) {
	const secret = "testsecret"
	t.Setenv("JWT_SECRET_KEY", secret)
	e := newEchoQuery(newTestMiddleware())

	token := buildSignedToken(t, secret, "1", true, time.Now().Add(-time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/test?jwt="+token, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code, "expired query-string token should be rejected")
}
