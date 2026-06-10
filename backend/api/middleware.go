package api

import (
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"rwaGateway/internal/services"
)

type rateWindow struct {
	start time.Time
	count int
}

var (
	rateLimitMu      sync.Mutex
	rateLimitWindows = make(map[string]rateWindow)
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
	return RequireRoles(requiredRole)
}

// RequireRoles authorizes from claims already verified by AuthMiddleware.
func RequireRoles(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleValue, exists := c.Get("role")
		userRole, ok := roleValue.(string)
		if !exists || !ok || userRole == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authenticated role is required"})
			c.Abort()
			return
		}

		if userRole == "admin" {
			c.Next()
			return
		}
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// RateLimitMiddleware API速率限制中间件
func RateLimitMiddleware() gin.HandlerFunc {
	limit := 120
	if configured, err := strconv.Atoi(os.Getenv("RATE_LIMIT_PER_MINUTE")); err == nil && configured > 0 {
		limit = configured
	}
	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()
		rateLimitMu.Lock()
		window := rateLimitWindows[key]
		if window.start.IsZero() || now.Sub(window.start) >= time.Minute {
			window = rateWindow{start: now}
		}
		window.count++
		rateLimitWindows[key] = window
		rateLimitMu.Unlock()

		if window.count > limit {
			retryAfter := int(time.Until(window.start.Add(time.Minute)).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// CORS中间件
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:3000"
		}
		if c.GetHeader("Origin") == allowedOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			c.Writer.Header().Set("Vary", "Origin")
		}
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
