package api

import (
	"testing"

	"rwaGateway/internal/database"
	"rwaGateway/internal/services"
)

func TestPublicRegistrationCannotSelfAssignPrivilegedRole(t *testing.T) {
	setupTestDatabase(t)
	router := contextRouter("", "")
	router.POST("/register", RegisterUser)
	response := performJSON(router, "POST", "/register", map[string]any{
		"username": "issuer-request",
		"email":    "issuer-request@example.com",
		"password": "secure-password",
		"address":  aliceAddress,
		"role":     "admin",
	})
	require.Equal(t, 200, response.Code, response.Body.String())

	user, err := database.GetUserByUsername("issuer-request")
	require.NoError(t, err)
	require.Equal(t, "investor", user.Role)

	token, _, err := services.NewAuthService().LoginUser("issuer-request", "secure-password")
	require.NoError(t, err)
	role, err := services.NewAuthService().GetUserRoleFromToken(token)
	require.NoError(t, err)
	require.Equal(t, "investor", role)
}
