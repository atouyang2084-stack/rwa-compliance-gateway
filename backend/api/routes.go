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

		// 需要身份验证的路由
		authGroup := v1.Group("/")
		authGroup.Use(AuthMiddleware())
		{
			// 合规验证路由
			compliance := authGroup.Group("/compliance")
			{
				compliance.POST("/verify", VerifyKYC)
			}

			// 资产相关路由
			assets := authGroup.Group("/assets")
			{
				assets.GET("/audit-trail", GetAssetAuditTrail)
				assets.GET("/list", GetAssets)
				assets.GET("/details", GetAssetDetails)
				assets.POST("/create", CreateAsset)
				assets.POST("/deposit", DepositAsset)
				assets.POST("/redeem", RedeemAsset)
				assets.POST("/transfer", TransferAsset)
				assets.POST("/freeze", FreezeAsset)
				assets.POST("/unfreeze", UnfreezeAsset)
			}
		}

		// 需要管理员权限的路由
		adminGroup := v1.Group("/admin")
		adminGroup.Use(RoleMiddleware("admin"))
		{
			// 这里可以添加需要管理员权限的路由
		}
	}
}
