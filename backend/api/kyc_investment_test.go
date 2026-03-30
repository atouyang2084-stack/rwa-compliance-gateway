package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"rwaGateway/internal/services"
)

// 模拟AuthMiddleware，始终通过验证
func mockAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// TestKYCVerificationAfterInvestment 测试KYC验证后仍无法投资的问题
func TestKYCVerificationAfterInvestment(t *testing.T) {
	// 初始化测试环境
	r := gin.Default()
	
	// 注册路由，但使用模拟的AuthMiddleware
	r.Use(CORSMiddleware())
	r.Use(RateLimitMiddleware())

	// API v1 路由组
	v1 := r.Group("/v1")
	{
		// 健康检查
		v1.GET("/health", HealthCheck)

		// 用户认证路由（不需要身份验证）
		auth := v1.Group("/auth")
		{
			auth.POST("/register", RegisterUser)
			auth.POST("/login", LoginUser)
		}

		// 需要身份验证的路由
		authGroup := v1.Group("/")
		authGroup.Use(mockAuthMiddleware()) // 使用模拟的认证中间件
		{
			// 合规验证路由
			compliance := authGroup.Group("/compliance")
			{
				compliance.POST("/verify", VerifyKYC)
				compliance.GET("/status", GetKYCStatus)
				// 制裁名单管理
				compliance.GET("/sanction-list", GetSanctionList)
				compliance.POST("/sync-sanction-list", SyncSanctionList)
				// 司法管辖区管理
				compliance.POST("/jurisdiction", AddJurisdiction)
				compliance.PUT("/jurisdiction/restrict", RestrictJurisdiction)
				compliance.POST("/address-jurisdiction", SetAddressJurisdiction)
				compliance.GET("/address-jurisdiction", GetAddressJurisdiction)
			}

			// 资产相关路由
			assets := authGroup.Group("/assets")
			{
				assets.GET("/audit-trail", GetAssetAuditTrail)
				assets.GET("/list", GetAssets)
				assets.GET("/details", GetAssetDetails)
				assets.GET("/balances", GetUserBalances)
				assets.GET("/total-balance", GetAssetTotalBalance)
				assets.POST("/create", CreateAsset)
				assets.POST("/deposit", DepositAsset)
				assets.POST("/redeem", RedeemAsset)
				assets.POST("/transfer", TransferAsset)
				assets.POST("/freeze", FreezeAsset)
				assets.POST("/unfreeze", UnfreezeAsset)
				assets.POST("/deactivate", DeactivateAsset)
			}
		}

		// 需要管理员权限的路由
		adminGroup := v1.Group("/admin")
		adminGroup.Use(mockAuthMiddleware()) // 使用模拟的认证中间件
		{
			// 这里可以添加需要管理员权限的路由
		}
	}

	// 测试用户地址
	userAddress := "0x1234567890123456789012345678901234567890"

	// 1. 首先检查KYC状态，应该返回已验证
	t.Run("Check KYC Status", func(t *testing.T) {
		// 模拟登录后的请求
		req, _ := http.NewRequest("GET", "/v1/compliance/status?address="+userAddress, nil)
		req.Header.Set("X-User-Role", "investor")

		// 执行请求
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// 检查响应
		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d", w.Code)
		}

		// 验证响应体包含verified: true
		if w.Body.String() != `{"verified":true,"address":"`+userAddress+`"}` {
			t.Fatalf("Expected KYC verified, got %s", w.Body.String())
		}
	})

	// 2. 测试IsKYCVerified方法，应该返回true
	t.Run("Test IsKYCVerified Method", func(t *testing.T) {
		kycService := services.NewOnfidoAPI()
		verified, err := kycService.IsKYCVerified(userAddress)
		if err != nil {
			t.Fatalf("IsKYCVerified returned error: %v", err)
		}
		if !verified {
			t.Fatalf("Expected IsKYCVerified to return true, got false")
		}
	})
}
