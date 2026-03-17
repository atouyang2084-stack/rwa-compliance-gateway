package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"rwaGateway/internal/services"
)

// AuthMiddleware 身份验证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// 检查Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		token := parts[1]
		
		// 验证token有效性
		authService := services.NewAuthService()
		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文
		c.Set("userID", claims["id"])
		c.Set("username", claims["username"])
		c.Set("email", claims["email"])
		c.Set("address", claims["address"])
		c.Set("role", claims["role"])

		c.Next()
	}
}

// RoleMiddleware 角色授权中间件
func RoleMiddleware(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// 检查Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		token := parts[1]
		
		// 验证token并获取角色
		authService := services.NewAuthService()
		userRole, err := authService.GetUserRoleFromToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// 角色权限映射
		rolePermissions := map[string][]string{
			"investor":   {"investor", "user"},
			"issuer":     {"issuer", "investor", "user"},
			"custodian":  {"custodian", "user"},
			"regulator":  {"regulator", "user"},
			"admin":      {"admin", "regulator", "custodian", "issuer", "investor", "user"},
		}

		// 检查用户是否有足够的权限
		allowedRoles, exists := rolePermissions[userRole]
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		// 检查是否包含所需角色
		hasPermission := false
		for _, role := range allowedRoles {
			if role == requiredRole {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitMiddleware API速率限制中间件
func RateLimitMiddleware() gin.HandlerFunc {
	// 这里应该实现速率限制逻辑
	// 暂时简单返回
	return func(c *gin.Context) {
		c.Next()
	}
}

// CORS中间件
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-User-Role")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
