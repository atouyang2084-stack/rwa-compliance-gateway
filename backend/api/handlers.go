package api

import (
	"net/http"

	"rwaGateway/internal/database"
	"rwaGateway/internal/services"

	"github.com/gin-gonic/gin"
)

// VerifyKYC 处理KYC验证请求
func VerifyKYC(c *gin.Context) {
	// 解析请求体
	var request struct {
		UserAddress     string `json:"userAddress" binding:"required"`
		VerificationData string `json:"verificationData" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 调用KYC服务进行验证
	kycService := services.NewOnfidoAPI()
	success, verificationId, err := kycService.VerifyKYC(request.UserAddress, request.VerificationData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusBadRequest, gin.H{"error": "KYC verification failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"verificationId": verificationId,
		"userId": request.UserAddress,
		"message": "KYC verification successful",
	})
}

// GetAssetAuditTrail 获取资产审计追踪
func GetAssetAuditTrail(c *gin.Context) {
	assetId := c.Query("assetId")
	if assetId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assetId is required"})
		return
	}

	// 这里应该从数据库或区块链获取资产审计追踪
	// 暂时返回模拟响应
	c.JSON(http.StatusOK, gin.H{
		"assetId": assetId,
		"auditTrail": []map[string]interface{}{
			{
				"timestamp": "2024-01-01T00:00:00Z",
				"action": "Asset Created",
				"actor": "0x1234567890123456789012345678901234567890",
				"details": "Initial asset creation",
			},
			{
				"timestamp": "2024-01-02T10:00:00Z",
				"action": "KYC Verified",
				"actor": "0x0987654321098765432109876543210987654321",
				"details": "User KYC verification completed",
			},
		},
	})
}

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "RWA Compliance Gateway",
	})
}

// CreateAsset 创建新资产
func CreateAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId           string `json:"assetId" binding:"required"`
		Name              string `json:"name" binding:"required"`
		Symbol            string `json:"symbol" binding:"required"`
		InitialValue      uint64 `json:"initialValue" binding:"required"`
		ComplianceRegistry string `json:"complianceRegistry" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 创建新资产
	asset := database.Asset{
		AssetID:      request.AssetId,
		Name:         request.Name,
		Symbol:       request.Symbol,
		TotalValue:   request.InitialValue,
		TotalTokens:  request.InitialValue,
		TokenAddress: "0x8221201A5c1c62bDfB0431beAD8843931f2A72aE", // 模拟地址
		IsActive:     true,
	}

	// 保存到数据库
	if err := database.CreateAsset(asset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"name": request.Name,
		"symbol": request.Symbol,
		"initialValue": request.InitialValue,
		"message": "Asset created successfully",
	})
}

// DepositAsset 存款（增加资产价值并铸造代币）
func DepositAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId string `json:"assetId" binding:"required"`
		Value   uint64 `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查资产是否存在
	_, err := database.GetAssetByID(request.AssetId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Asset not found",
		})
		return
	}

	// 更新资产价值和代币数量
	if err := database.UpdateAssetValue(request.AssetId, request.Value, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"value": request.Value,
		"message": "Deposit successful",
	})
}

// RedeemAsset 赎回（销毁代币并释放资产价值）
func RedeemAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId string `json:"assetId" binding:"required"`
		Tokens  uint64 `json:"tokens" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查资产是否存在
	asset, err := database.GetAssetByID(request.AssetId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Asset not found",
		})
		return
	}

	// 检查代币数量是否足够
	if asset.TotalTokens < request.Tokens {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Insufficient tokens",
		})
		return
	}

	// 更新资产价值和代币数量
	if err := database.UpdateAssetValue(request.AssetId, request.Tokens, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"tokens": request.Tokens,
		"message": "Redeem successful",
	})
}

// GetAssets 获取所有资产
func GetAssets(c *gin.Context) {
	// 从数据库获取资产列表
	assets, err := database.GetAllAssets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为响应格式
	var responseAssets []map[string]interface{}
	for _, asset := range assets {
		responseAssets = append(responseAssets, map[string]interface{}{
			"assetId": asset.AssetID,
			"name": asset.Name,
			"symbol": asset.Symbol,
			"totalValue": asset.TotalValue,
			"totalTokens": asset.TotalTokens,
			"tokenAddress": asset.TokenAddress,
			"isActive": asset.IsActive,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assets": responseAssets,
	})
}

// GetAssetDetails 获取资产详情
func GetAssetDetails(c *gin.Context) {
	assetId := c.Query("assetId")
	if assetId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assetId is required"})
		return
	}

	// 从数据库获取资产
	asset, err := database.GetAssetByID(assetId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	// 转换为响应格式
	responseAsset := map[string]interface{}{
		"assetId": asset.AssetID,
		"name": asset.Name,
		"symbol": asset.Symbol,
		"totalValue": asset.TotalValue,
		"totalTokens": asset.TotalTokens,
		"tokenAddress": asset.TokenAddress,
		"isActive": asset.IsActive,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"asset": responseAsset,
	})
}
