package api

import (
	"log"
	"net/http"
	"sync"

	"rwaGateway/internal/database"
	"rwaGateway/internal/services"
	"rwaGateway/utils"

	"github.com/gin-gonic/gin"
)

// 用于存储已使用的nonce值，防止重复提交
var (
	nonceStore = make(map[string]bool)
	nonceMutex sync.Mutex
)

// VerifyKYC 处理KYC验证请求
func VerifyKYC(c *gin.Context) {
	// 解析请求体
	var request struct {
		UserAddress      string `json:"userAddress" binding:"required"`
		VerificationData string `json:"verificationData" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证用户地址格式
	if !utils.IsValidAddress(request.UserAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user address format"})
		return
	}

	// 输入验证：验证KYC数据
	if !utils.IsValidKYCData(request.VerificationData) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification data"})
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

	// 更新数据库中的KYC验证状态
	if err := database.UpdateKYCVerified(request.UserAddress, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update KYC status"})
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

	// 从数据库获取资产审计日志
	logs, err := database.GetAssetAuditLogs(assetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为响应格式
	var auditTrail []map[string]interface{}
	for _, log := range logs {
		auditTrail = append(auditTrail, map[string]interface{}{
			"timestamp":     log.CreatedAt,
			"action":        log.Action,
			"actor":         log.UserAddress,
			"amount":        log.Amount,
			"targetAddress": log.TargetAddress,
			"details":       log.Details,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"assetId":    assetId,
		"auditTrail": auditTrail,
	})
}

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "RWA Compliance Gateway",
	})
}

// GetKYCStatus 获取用户的KYC验证状态
func GetKYCStatus(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	// 从数据库获取KYC验证状态
	verified, err := database.GetKYCVerified(address)
	if err != nil {
		// 如果数据库中没有记录，使用KYC服务进行验证（测试模式）
		kycService := services.NewOnfidoAPI()
		verified, err = kycService.IsKYCVerified(address)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"verified": verified,
		"address":  address,
	})
}

// CreateAsset 创建新资产
func CreateAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId            string  `json:"assetId" binding:"required"`
		Name               string  `json:"name" binding:"required"`
		Symbol             string  `json:"symbol" binding:"required"`
		InitialValue       float64 `json:"initialValue" binding:"required"`
		ComplianceRegistry string  `json:"complianceRegistry" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}

	// 输入验证：验证代币符号格式
	if !utils.IsValidTokenSymbol(request.Symbol) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token symbol format"})
		return
	}

	// 输入验证：验证金额
	if request.InitialValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid initial value"})
		return
	}

	// 创建新资产
	// 代币数量设为固定值1000000，这样代币价格会随资产价值变化而变化
	const fixedTotalTokens = uint64(1000000)
	asset := database.Asset{
		AssetID:      request.AssetId,
		Name:         request.Name,
		Symbol:       request.Symbol,
		TotalValue:   float64(request.InitialValue),
		TotalTokens:  fixedTotalTokens,
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

// DepositAsset 存款（增加资产价值并分配代币）
func DepositAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId     string  `json:"assetId" binding:"required"`
		Value       float64 `json:"value" binding:"required"`
		UserAddress string  `json:"userAddress" binding:"required"`
		Nonce       string  `json:"nonce" binding:"required"` // 防重复提交
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}

	// 输入验证：验证金额
	if request.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid value"})
		return
	}

	// 输入验证：验证用户地址格式
	if !utils.IsValidAddress(request.UserAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user address format"})
		return
	}

	// 检查地址是否在制裁名单中
	sanctionsService := services.NewSanctionsService()
	isSanctioned, err := sanctionsService.IsAddressSanctioned(request.UserAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return
	}
	if isSanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "User address is sanctioned"})
		return
	}

	// 检查nonce是否已使用，防止重复提交
	nonceMutex.Lock()
	if nonceStore[request.Nonce] {
		nonceMutex.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate request detected"})
		return
	}
	nonceStore[request.Nonce] = true
	nonceMutex.Unlock()

	// 检查资产是否存在
	asset, err := database.GetAssetByID(request.AssetId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Asset not found",
		})
		return
	}

	// 检查用户是否已KYC验证
	kycService := services.NewOnfidoAPI()
	isVerified, err := kycService.IsKYCVerified(request.UserAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check KYC status"})
		return
	}
	if !isVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "User KYC not verified"})
		return
	}

	// 检查总余额是否超过代币总量
	allBalances, err := database.GetAllUserAssetBalances(request.AssetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	currentTotalBalance := 0
	for _, balance := range allBalances {
		currentTotalBalance += balance.Balance
	}

	// 计算代币数量
	var tokensToAdd int
	if asset.TotalValue == 0 {
		// 首次存款，设置固定的代币总量
		const fixedTotalTokens = uint64(1000000) // 固定100万代币
		// 首次存款需要初始化代币总量
		if err := database.UpdateAssetTokens(request.AssetId, fixedTotalTokens, true); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// 首次存款，代币数量等于固定总量
		tokensToAdd = int(fixedTotalTokens)
	} else {
		// 使用浮点数计算以保持精度
		tokensToAdd = int(float64(request.Value) * float64(asset.TotalTokens) / float64(asset.TotalValue))
		// 确保至少分配1个代币
		if tokensToAdd < 1 {
			tokensToAdd = 1
		}
	}

	// 检查是否超过总供应量
	if currentTotalBalance+tokensToAdd > int(asset.TotalTokens) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Exceeds total token supply"})
		return
	}

	// 当资产价值不为0时，按比例调整现有用户的余额
	if asset.TotalValue != 0 {
		// 获取所有用户的资产余额
		allBalances, err := database.GetAllUserAssetBalances(request.AssetId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		// 计算需要从每个用户减少的代币数量
		// 按比例减少现有用户的余额
		for _, balance := range allBalances {
			if balance.UserAddress != request.UserAddress {
				// 计算需要减少的代币数量
				tokensToReduce := int(float64(balance.Balance) * float64(tokensToAdd) / float64(asset.TotalTokens))
				if tokensToReduce > 0 {
					// 更新用户资产余额（减少）
					if err := database.UpdateUserAssetBalance(balance.UserAddress, request.AssetId, -tokensToReduce); err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
				}
			}
		}
	}

	// 更新资产价值
	if err := database.UpdateAssetValue(request.AssetId, request.Value, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新用户资产余额
	if err := database.UpdateUserAssetBalance(request.UserAddress, request.AssetId, tokensToAdd); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 创建审计日志
	if err := database.CreateAuditLog("deposit", request.UserAddress, request.AssetId, int(request.Value), "", "Deposit successful"); err != nil {
		// 审计日志创建失败不影响主操作
		log.Println("Failed to create audit log:", err)
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"assetId":     request.AssetId,
		"value":       request.Value,
		"tokens":      tokensToAdd,
		"userAddress": request.UserAddress,
		"message":     "Deposit successful",
	})
}

// RedeemAsset 赎回（销毁代币并释放资产价值）
func RedeemAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId     string `json:"assetId" binding:"required"`
		Tokens      uint64 `json:"tokens" binding:"required"`
		UserAddress string `json:"userAddress" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}

	// 输入验证：验证代币数量
	if !utils.IsValidAmount(int64(request.Tokens)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tokens amount"})
		return
	}

	// 输入验证：验证用户地址格式
	if !utils.IsValidAddress(request.UserAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user address format"})
		return
	}

	// 检查地址是否在制裁名单中
	sanctionsService := services.NewSanctionsService()
	isSanctioned, err := sanctionsService.IsAddressSanctioned(request.UserAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return
	}
	if isSanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "User address is sanctioned"})
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

	// 检查用户是否已KYC验证
	kycService := services.NewOnfidoAPI()
	isVerified, err := kycService.IsKYCVerified(request.UserAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check KYC status"})
		return
	}
	if !isVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "User KYC not verified"})
		return
	}

	// 检查用户余额是否足够
	userBalance, err := database.GetUserAssetBalance(request.UserAddress, request.AssetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if userBalance < int(request.Tokens) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Insufficient tokens in user balance",
		})
		return
	}

	// 计算赎回的价值
	// 赎回价值 = 代币数量 * 资产总价值 / 代币总量
	valueToRedeem := float64(request.Tokens) * asset.TotalValue / float64(asset.TotalTokens)

	// 确保至少赎回0.01美元
	if valueToRedeem < 0.01 {
		valueToRedeem = 0.01
	}

	// 更新资产价值
	if err := database.UpdateAssetValue(request.AssetId, valueToRedeem, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新用户资产余额（减少）
	if err := database.UpdateUserAssetBalance(request.UserAddress, request.AssetId, -int(request.Tokens)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 创建审计日志
	if err := database.CreateAuditLog("redeem", request.UserAddress, request.AssetId, int(valueToRedeem), "", "Redeem successful"); err != nil {
		// 审计日志创建失败不影响主操作
		log.Println("Failed to create audit log:", err)
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"assetId":     request.AssetId,
		"tokens":      request.Tokens,
		"value":       valueToRedeem,
		"userAddress": request.UserAddress,
		"message":     "Redeem successful",
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

// TransferAsset 转账（在用户之间转移代币）
func TransferAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId     string `json:"assetId" binding:"required"`
		FromAddress string `json:"fromAddress" binding:"required"`
		ToAddress   string `json:"toAddress" binding:"required"`
		Amount      uint64 `json:"amount" binding:"required"`
		Nonce       string `json:"nonce" binding:"required"` // 防重复提交
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}

	// 输入验证：验证地址格式
	if !utils.IsValidAddress(request.FromAddress) || !utils.IsValidAddress(request.ToAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address format"})
		return
	}

	// 输入验证：验证金额
	if !utils.IsValidAmount(int64(request.Amount)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	// 检查nonce是否已使用，防止重复提交
	nonceMutex.Lock()
	if nonceStore[request.Nonce] {
		nonceMutex.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate request detected"})
		return
	}
	nonceStore[request.Nonce] = true
	nonceMutex.Unlock()

	// 检查资产是否存在
	_, err := database.GetAssetByID(request.AssetId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Asset not found",
		})
		return
	}

	// 检查地址是否在制裁名单中
	sanctionsService := services.NewSanctionsService()
	
	// 检查发送方地址
	isSanctioned, err := sanctionsService.IsAddressSanctioned(request.FromAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return
	}
	if isSanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sender address is sanctioned"})
		return
	}

	// 检查接收方地址
	isSanctioned, err = sanctionsService.IsAddressSanctioned(request.ToAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return
	}
	if isSanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Recipient address is sanctioned"})
		return
	}

	// 检查用户是否已KYC验证
	kycService := services.NewOnfidoAPI()
	isVerified, err := kycService.IsKYCVerified(request.FromAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check KYC status"})
		return
	}
	if !isVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sender KYC not verified"})
		return
	}

	// 检查接收方是否已KYC验证
	isVerified, err = kycService.IsKYCVerified(request.ToAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check KYC status"})
		return
	}
	if !isVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Recipient KYC not verified"})
		return
	}

	// 检查发送方余额是否足够
	senderBalance, err := database.GetUserAssetBalance(request.FromAddress, request.AssetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if senderBalance < int(request.Amount) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Insufficient tokens in sender balance",
		})
		return
	}

	// 执行转账：从发送方扣除代币
	if err := database.UpdateUserAssetBalance(request.FromAddress, request.AssetId, -int(request.Amount)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 执行转账：给接收方增加代币
	if err := database.UpdateUserAssetBalance(request.ToAddress, request.AssetId, int(request.Amount)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 创建审计日志
	if err := database.CreateAuditLog("transfer", request.FromAddress, request.AssetId, int(request.Amount), request.ToAddress, "Transfer successful"); err != nil {
		// 审计日志创建失败不影响主操作
		log.Println("Failed to create audit log:", err)
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"from": request.FromAddress,
		"to": request.ToAddress,
		"amount": request.Amount,
		"message": "Transfer successful",
	})
}

// FreezeAsset 冻结资产
func FreezeAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId string `json:"assetId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
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

	// 检查资产是否已经冻结
	if !asset.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Asset is already frozen",
		})
		return
	}

	// 更新资产状态为冻结
	if err := database.UpdateAssetStatus(request.AssetId, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"message": "Asset frozen successfully",
	})
}

// UnfreezeAsset 解冻资产
func UnfreezeAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId string `json:"assetId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
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

	// 检查资产是否已经解冻
	if asset.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Asset is already active",
		})
		return
	}

	// 更新资产状态为解冻
	if err := database.UpdateAssetStatus(request.AssetId, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"message": "Asset unfrozen successfully",
	})
}

// 下架资产
func DeactivateAsset(c *gin.Context) {
	// 解析请求体
	var request struct {
		AssetId string `json:"assetId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证资产ID格式
	if !utils.IsValidAssetId(request.AssetId) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
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

	// 检查资产是否已经下架
	if !asset.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Asset is already inactive",
		})
		return
	}

	// 下架资产（设置为非活跃状态）
	if err := database.UpdateAssetStatus(request.AssetId, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"assetId": request.AssetId,
		"message": "Asset deactivated successfully",
	})
}

// SyncSanctionList 同步制裁名单
func SyncSanctionList(c *gin.Context) {
	sanctionsService := services.NewSanctionsService()
	
	// 同步制裁名单
	if err := sanctionsService.SyncSanctionList(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to sync sanction list",
		})
		return
	}

	// 获取当前制裁地址列表
	sanctionedAddresses := sanctionsService.GetSanctionedAddresses()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sanction list synced successfully",
		"sanctionedAddresses": sanctionedAddresses,
	})
}

// GetSanctionList 获取制裁名单或添加制裁地址
func GetSanctionList(c *gin.Context) {
	sanctionsService := services.NewSanctionsService()
	
	// 处理 POST 请求：添加制裁地址
	if c.Request.Method == "POST" {
		var request struct {
			Address string `json:"address" binding:"required"`
		}
		
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		// 添加制裁地址
		sanctionsService.AddToSanctionList(request.Address)
		
		// 获取更新后的制裁地址列表
		sanctionedAddresses := sanctionsService.GetSanctionedAddresses()
		
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Sanction address added successfully",
			"sanctionedAddresses": sanctionedAddresses,
		})
		return
	}
	
	// 处理 GET 请求：获取制裁地址列表
	sanctionedAddresses := sanctionsService.GetSanctionedAddresses()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"sanctionedAddresses": sanctionedAddresses,
	})
}

// Jurisdiction管理

// AddJurisdiction 添加司法管辖区
func AddJurisdiction(c *gin.Context) {
	var request struct {
		Jurisdiction string `json:"jurisdiction" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 这里应该调用智能合约添加司法管辖区
	// 暂时返回模拟响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jurisdiction added successfully",
		"jurisdiction": request.Jurisdiction,
	})
}

// RestrictJurisdiction 限制司法管辖区
func RestrictJurisdiction(c *gin.Context) {
	var request struct {
		Jurisdiction string `json:"jurisdiction" binding:"required"`
		Restricted   bool   `json:"restricted" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 这里应该调用智能合约限制司法管辖区
	// 暂时返回模拟响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jurisdiction restriction updated successfully",
		"jurisdiction": request.Jurisdiction,
		"restricted": request.Restricted,
	})
}

// SetAddressJurisdiction 设置地址司法管辖区
func SetAddressJurisdiction(c *gin.Context) {
	var request struct {
		Address      string `json:"address" binding:"required"`
		Jurisdiction string `json:"jurisdiction" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证地址格式
	if !utils.IsValidAddress(request.Address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address format"})
		return
	}

	// 这里应该调用智能合约设置地址司法管辖区
	// 暂时返回模拟响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Address jurisdiction set successfully",
		"address": request.Address,
		"jurisdiction": request.Jurisdiction,
	})
}

// GetAddressJurisdiction 获取地址司法管辖区
func GetAddressJurisdiction(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	// 输入验证：验证地址格式
	if !utils.IsValidAddress(address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address format"})
		return
	}

	// 这里应该调用智能合约获取地址司法管辖区
	// 暂时返回模拟响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"address": address,
		"jurisdiction": "US", // 模拟数据
	})
}

// GetUserBalances 获取用户的所有资产余额
func GetUserBalances(c *gin.Context) {
	userAddress := c.Query("userAddress")
	if userAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userAddress is required"})
		return
	}

	// 输入验证：验证地址格式
	if !utils.IsValidAddress(userAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user address format"})
		return
	}

	// 获取用户资产余额
	balances, err := database.GetUserBalances(userAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为响应格式
	var responseBalances []map[string]interface{}
	for _, balance := range balances {
		responseBalances = append(responseBalances, map[string]interface{}{
			"assetId":   balance.AssetID,
			"balance":   balance.Balance,
			"updatedAt": balance.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"balances": responseBalances,
	})
}

// GetAssetTotalBalance 获取资产的总余额（所有用户的余额之和）
func GetAssetTotalBalance(c *gin.Context) {
	assetId := c.Query("assetId")
	if assetId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assetId is required"})
		return
	}

	// 获取所有用户的资产余额
	allBalances, err := database.GetAllUserAssetBalances(assetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 计算总余额
	totalBalance := 0
	for _, balance := range allBalances {
		totalBalance += balance.Balance
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"assetId":       assetId,
		"totalBalance":  totalBalance,
	})
}

// RegisterUser 用户注册
func RegisterUser(c *gin.Context) {
	var request struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Address  string `json:"address" binding:"required"`
		Role     string `json:"role"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 输入验证：验证地址格式
	if !utils.IsValidAddress(request.Address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address format"})
		return
	}

	// 检查地址是否在制裁名单中
	sanctionsService := services.NewSanctionsService()
	isSanctioned, err := sanctionsService.IsAddressSanctioned(request.Address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return
	}
	if isSanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Address is sanctioned"})
		return
	}

	// 设置默认角色
	if request.Role == "" {
		request.Role = "investor"
	}

	// 注册用户
	authService := services.NewAuthService()
	err = authService.RegisterUser(request.Username, request.Email, request.Password, request.Address, request.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User registered successfully",
		"username": request.Username,
		"email": request.Email,
		"role": request.Role,
	})
}

// LoginUser 用户登录
func LoginUser(c *gin.Context) {
	var request struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 登录用户
	authService := services.NewAuthService()
	token, user, err := authService.LoginUser(request.Username, request.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"token": token,
		"user": gin.H{
			"id": user.ID,
			"username": user.Username,
			"email": user.Email,
			"address": user.Address,
			"role": user.Role,
		},
	})
}
