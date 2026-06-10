package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"rwaGateway/internal/database"
)

func TestKYCStatusUsesAuthenticatedWallet(t *testing.T) {
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	createVerifiedUser(t, "bob", bobAddress)
	require.NoError(t, database.UpdateKYCVerified(bobAddress, false))

	router := contextRouter("investor", aliceAddress)
	router.GET("/status", GetKYCStatus)
	request := httptest.NewRequest(http.MethodGet, "/status?address="+bobAddress, nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	require.Equal(t, http.StatusOK, response.Code)
	require.Contains(t, response.Body.String(), aliceAddress)
	require.Contains(t, response.Body.String(), `"verified":true`)
}

func TestAuthenticatedAddressIsRequired(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/status", GetKYCStatus)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/status", nil))
	require.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestJurisdictionStateIsPersistedForAuthenticatedWallet(t *testing.T) {
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	_, err := database.SetAddressJurisdiction(aliceAddress, "US")
	require.NoError(t, err)

	router := contextRouter("investor", aliceAddress)
	router.GET("/jurisdiction", GetAddressJurisdiction)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/jurisdiction?address="+bobAddress, nil))
	require.Equal(t, http.StatusOK, response.Code)
	require.Contains(t, response.Body.String(), aliceAddress)
	require.Contains(t, response.Body.String(), `"jurisdiction":"US"`)
}

func TestDemoKYCUsesAuthenticatedWallet(t *testing.T) {
	t.Setenv("KYC_MODE", "demo")
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	require.NoError(t, database.UpdateKYCVerified(aliceAddress, false))

	router := contextRouter("investor", aliceAddress)
	router.POST("/verify", VerifyKYC)
	verificationData, _ := json.Marshal(map[string]string{
		"firstName": "Alice",
		"lastName":  "Investor",
		"email":     "alice@example.com",
		"dob":       "1990-01-01",
		"passport":  "P123456789",
	})
	payload, _ := json.Marshal(map[string]string{
		"userAddress":      bobAddress,
		"verificationData": string(verificationData),
	})
	request := httptest.NewRequest(http.MethodPost, "/verify", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), aliceAddress)
	require.Contains(t, response.Body.String(), "DEMO-KYC-")
	aliceVerified, err := database.GetKYCVerified(aliceAddress)
	require.NoError(t, err)
	require.Equal(t, true, aliceVerified)
}
