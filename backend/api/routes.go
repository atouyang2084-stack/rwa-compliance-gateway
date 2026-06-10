package api

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	// 添加全局中间件
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
		authGroup.Use(AuthMiddleware())
		{
			// 合规验证路由
			compliance := authGroup.Group("/compliance")
			{
				compliance.POST("/verify", VerifyKYC)
				compliance.GET("/status", GetKYCStatus)
				compliance.GET("/address-jurisdiction", GetAddressJurisdiction)
				compliance.GET("/sanction-list", RequireRoles("regulator"), GetSanctionList)
				compliance.POST("/sanction-list", RequireRoles("regulator"), GetSanctionList)
				compliance.POST("/jurisdiction", RequireRoles("regulator"), AddJurisdiction)
				compliance.PUT("/jurisdiction/restrict", RequireRoles("regulator"), RestrictJurisdiction)
				compliance.POST("/address-jurisdiction", RequireRoles("regulator"), SetAddressJurisdiction)
			}

			// 资产相关路由
			assets := authGroup.Group("/assets")
			{
				assets.GET("/audit-trail", GetAssetAuditTrail)
				assets.GET("/list", GetAssetsSecure)
				assets.GET("/details", GetAssetDetailsSecure)
				assets.GET("/balances", GetUserBalancesSecure)
				assets.GET("/total-balance", GetAssetTotalBalanceSecure)
				assets.POST("/create", RequireRoles("issuer"), CreateAssetSecure)
				assets.POST("/deposit", DepositAssetSecure)
				assets.POST("/redeem", RedeemAssetSecure)
				assets.POST("/transfer", TransferAssetSecure)
				assets.POST("/freeze", RequireRoles("custodian", "regulator"), FreezeAsset)
				assets.POST("/unfreeze", RequireRoles("custodian", "regulator"), UnfreezeAsset)
				assets.POST("/deactivate", RequireRoles("regulator"), DeactivateAsset)
			}
		}

		// 需要管理员权限的路由
		adminGroup := v1.Group("/admin")
		adminGroup.Use(AuthMiddleware(), RequireRoles("admin"))
		{
			// 这里可以添加需要管理员权限的路由
		}
	}
}
