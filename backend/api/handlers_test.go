package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"rwaGateway/internal/database"
)

var require = struct {
	NoError  func(*testing.T, error)
	Equal    func(*testing.T, any, any, ...any)
	Contains func(*testing.T, string, string)
}{
	NoError: func(t *testing.T, err error) {
		t.Helper()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	},
	Equal: func(t *testing.T, expected, actual any, message ...any) {
		t.Helper()
		if !reflect.DeepEqual(expected, actual) {
			t.Fatalf("expected %#v, got %#v: %v", expected, actual, message)
		}
	},
	Contains: func(t *testing.T, value, substring string) {
		t.Helper()
		if !strings.Contains(value, substring) {
			t.Fatalf("expected %q to contain %q", value, substring)
		}
	},
}

const (
	aliceAddress   = "0x1111111111111111111111111111111111111111"
	bobAddress     = "0x2222222222222222222222222222222222222222"
	malloryAddress = "0x3333333333333333333333333333333333333333"
)

func setupTestDatabase(t *testing.T) {
	t.Helper()
	if database.DB != nil {
		_ = database.Close()
	}
	require.NoError(t, database.InitDatabase(filepath.Join(t.TempDir(), "gateway.db")))
	t.Cleanup(func() { _ = database.Close() })
}

func createVerifiedUser(t *testing.T, username, address string) {
	t.Helper()
	require.NoError(t, database.CreateUser(username, username+"@example.com", "hash", address, "investor"))
	require.NoError(t, database.UpdateKYCVerified(address, true))
}

func contextRouter(role, address string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("role", role)
		c.Set("address", address)
		c.Next()
	})
	return router
}

func performJSON(router http.Handler, method, path string, body map[string]any) *httptest.ResponseRecorder {
	payload, _ := json.Marshal(body)
	request := httptest.NewRequest(method, path, bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestRequireRolesRejectsInvestorOnIssuerRoute(t *testing.T) {
	router := contextRouter("investor", aliceAddress)
	router.POST("/issuer", RequireRoles("issuer"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	response := performJSON(router, http.MethodPost, "/issuer", map[string]any{})
	require.Equal(t, http.StatusForbidden, response.Code)
}

func TestTransferUsesAuthenticatedActorAndNonceIsAtomic(t *testing.T) {
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	createVerifiedUser(t, "bob", bobAddress)
	createVerifiedUser(t, "mallory", malloryAddress)
	require.NoError(t, database.CreateAsset(aliceAddress, "create-asset-1", database.Asset{
		AssetID: "asset-1", Name: "Demo Asset", Symbol: "DA",
		TotalValueUnits: "100000", TotalTokenUnits: "100000",
		TokenAddress: "0x4444444444444444444444444444444444444444", IsActive: true,
	}))
	require.NoError(t, database.DepositUnits(aliceAddress, "asset-1", "50000", "seed-alice"))

	router := contextRouter("investor", aliceAddress)
	router.POST("/transfer", TransferAssetSecure)
	body := map[string]any{
		"assetId": "asset-1", "fromAddress": malloryAddress,
		"toAddress": bobAddress, "amountUnits": "1250", "nonce": "transfer-1",
	}
	first := performJSON(router, http.MethodPost, "/transfer", body)
	require.Equal(t, http.StatusOK, first.Code, first.Body.String())

	alice, err := database.UnitBalance(aliceAddress, "asset-1")
	require.NoError(t, err)
	bob, err := database.UnitBalance(bobAddress, "asset-1")
	require.NoError(t, err)
	mallory, err := database.UnitBalance(malloryAddress, "asset-1")
	require.NoError(t, err)
	require.Equal(t, "48750", alice)
	require.Equal(t, "1250", bob)
	require.Equal(t, "0", mallory)

	second := performJSON(router, http.MethodPost, "/transfer", body)
	require.Equal(t, http.StatusConflict, second.Code)
	aliceAfter, _ := database.UnitBalance(aliceAddress, "asset-1")
	bobAfter, _ := database.UnitBalance(bobAddress, "asset-1")
	require.Equal(t, alice, aliceAfter)
	require.Equal(t, bob, bobAfter)

	verified, err := database.VerifyUnitAuditChain("asset-1")
	require.NoError(t, err)
	require.Equal(t, true, verified)
	logs, err := database.UnitAuditLogs("asset-1")
	require.NoError(t, err)
	require.Equal(t, 3, len(logs))
	require.Equal(t, "transfer-1", logs[0].RequestNonce)
	require.Equal(t, 64, len(logs[0].EventHash))
}

func TestAuditChainDetectsTampering(t *testing.T) {
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	require.NoError(t, database.CreateAsset(aliceAddress, "create-audit", database.Asset{
		AssetID: "audit-asset", Name: "Audit Asset", Symbol: "AUD",
		TotalValueUnits: "1000", TotalTokenUnits: "1000",
		TokenAddress: "ledger://audit-asset", IsActive: true,
	}))
	verified, err := database.VerifyUnitAuditChain("audit-asset")
	require.NoError(t, err)
	require.Equal(t, true, verified)

	_, err = database.DB.Exec(
		"UPDATE audit_unit_logs SET details = ? WHERE asset_id = ?",
		"tampered", "audit-asset",
	)
	require.NoError(t, err)
	verified, err = database.VerifyUnitAuditChain("audit-asset")
	require.NoError(t, err)
	require.Equal(t, false, verified)
}

func TestDepositRejectsFloatAndUint256Overflow(t *testing.T) {
	setupTestDatabase(t)
	createVerifiedUser(t, "alice", aliceAddress)
	require.NoError(t, database.CreateAsset(aliceAddress, "create-asset-2", database.Asset{
		AssetID: "asset-1", Name: "Demo Asset", Symbol: "DA",
		TotalValueUnits: "100000", TotalTokenUnits: "100000",
		TokenAddress: "0x4444444444444444444444444444444444444444", IsActive: true,
	}))

	router := contextRouter("investor", aliceAddress)
	router.POST("/deposit", DepositAssetSecure)
	for index, value := range []string{
		"1.25",
		"115792089237316195423570985008687907853269984665640564039457584007913129639936",
	} {
		response := performJSON(router, http.MethodPost, "/deposit", map[string]any{
			"assetId": "asset-1", "valueUnits": value, "nonce": "bad-" + string(rune('a'+index)),
		})
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	balance, err := database.UnitBalance(aliceAddress, "asset-1")
	require.NoError(t, err)
	require.Equal(t, "0", balance)
}
