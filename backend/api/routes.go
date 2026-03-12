package api

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	// API v1 路由组
	v1 := r.Group("/v1")
	{
		// 合规验证路由
		compliance := v1.Group("/compliance")
		{
			compliance.POST("/verify", VerifyKYC)
		}

		// 资产相关路由
		assets := v1.Group("/assets")
		{
			assets.GET("/audit-trail", GetAssetAuditTrail)
		}

		// 健康检查
		v1.GET("/health", HealthCheck)
	}
}
