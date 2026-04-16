package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateJwtToken_ReturnsNonEmptyToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")
	token, err := createJwtToken("42")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestCreateJwtToken_ParsesWithV5(t *testing.T) {
	const secret = "testsecret"
	t.Setenv("JWT_SECRET_KEY", secret)

	tokenStr, err := createJwtToken("42")
	require.NoError(t, err)

	token, err := jwt.Parse(tokenStr, func(tok *jwt.Token) (interface{}, error) {
		_, ok := tok.Method.(*jwt.SigningMethodHMAC)
		require.True(t, ok, "expected HMAC signing method")
		return []byte(secret), nil
	})
	require.NoError(t, err)
	assert.True(t, token.Valid)
}

func TestCreateJwtToken_UsesHS256(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "testsecret")

	tokenStr, err := createJwtToken("1")
	require.NoError(t, err)

	// ParseUnverified lets us inspect headers without needing the key
	token, _, err := new(jwt.Parser).ParseUnverified(tokenStr, jwt.MapClaims{})
	require.NoError(t, err)
	assert.Equal(t, "HS256", token.Method.Alg())
}

func TestCreateJwtToken_ContainsUserIdClaim(t *testing.T) {
	const secret = "testsecret"
	t.Setenv("JWT_SECRET_KEY", secret)

	tokenStr, err := createJwtToken("99")
	require.NoError(t, err)

	token, err := jwt.ParseWithClaims(tokenStr, jwt.MapClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	require.NoError(t, err)

	claims, ok := token.Claims.(jwt.MapClaims)
	require.True(t, ok)
	assert.Equal(t, "99", claims["userId"])
	assert.Equal(t, true, claims["authorized"])
}

func TestCreateJwtToken_ExpiresInFuture(t *testing.T) {
	const secret = "testsecret"
	t.Setenv("JWT_SECRET_KEY", secret)

	tokenStr, err := createJwtToken("1")
	require.NoError(t, err)

	token, err := jwt.ParseWithClaims(tokenStr, jwt.MapClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	require.NoError(t, err)

	exp, err := token.Claims.GetExpirationTime()
	require.NoError(t, err)
	assert.True(t, exp.After(time.Now()), "token expiry should be in the future")
}

func TestCreateJwtToken_WrongKeyRejected(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "correctsecret")

	tokenStr, err := createJwtToken("1")
	require.NoError(t, err)

	_, err = jwt.Parse(tokenStr, func(tok *jwt.Token) (interface{}, error) {
		return []byte("wrongsecret"), nil
	})
	assert.Error(t, err, "token signed with different key should fail to parse")
}
