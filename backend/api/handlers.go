package api

import (
	"log"
	"net/http"
	"strings"

	"rwaGateway/internal/database"
	"rwaGateway/internal/services"
	"rwaGateway/utils"

	"github.com/gin-gonic/gin"
)

func authenticatedAddress(c *gin.Context) (string, bool) {
	value, exists := c.Get("address")
	address, ok := value.(string)
	if !exists || !ok || !utils.IsValidAddress(address) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authenticated wallet address is required"})
		return "", false
	}
	return strings.ToLower(address), true
}

// VerifyKYC 处理KYC验证请求
func VerifyKYC(c *gin.Context) {
	// 解析请求体
	var request struct {
		VerificationData string `json:"verificationData" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userAddress, ok := authenticatedAddress(c)
	if !ok {
		return
	}

	// 输入验证：验证KYC数据
	if !utils.IsValidKYCData(request.VerificationData) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification data"})
		return
	}

	// 调用KYC服务进行验证
	kycService := services.NewOnfidoAPI()
	success, verificationId, err := kycService.VerifyKYC(userAddress, request.VerificationData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusBadRequest, gin.H{"error": "KYC verification failed"})
		return
	}

	// 更新数据库中的KYC验证状态
	if err := database.UpdateKYCVerified(userAddress, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update KYC status"})
		return
	}

	// 获取KYC数据哈希
	dataHash, err := database.GetKYCDataHash(userAddress)
	if err != nil {
		// 记录错误但不中断流程
		log.Printf("Failed to get KYC data hash: %v", err)
	} else if dataHash != "" {
		// 将数据哈希锚定到智能合约
		contractService, err := services.NewContractService()
		if err != nil {
			// 记录错误但不中断流程
			log.Printf("Failed to create contract service: %v", err)
		} else {
			defer contractService.Close()
			if err := contractService.SetKYCDataHash(userAddress, dataHash); err != nil {
				log.Printf("Failed to anchor KYC data hash: %v", err)
			} else {
				log.Printf("Successfully anchored KYC data hash on chain for address: %s", userAddress)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"verificationId": verificationId,
		"userId":         userAddress,
		"message":        "KYC verification successful",
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
	logs, err := database.UnitAuditLogs(assetId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	integrityVerified, err := database.VerifyUnitAuditChain(assetId)
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
			"amountUnits":   log.AmountUnits,
			"targetAddress": log.TargetAddress,
			"requestNonce":  log.RequestNonce,
			"previousHash":  log.PreviousHash,
			"eventHash":     log.EventHash,
			"details":       log.Details,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"assetId":           assetId,
		"auditTrail":        auditTrail,
		"integrityVerified": integrityVerified,
	})
}

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "RWA Compliance Gateway",
	})
}

// GetKYCStatus 获取用户的KYC验证状态
func GetKYCStatus(c *gin.Context) {
	address, ok := authenticatedAddress(c)
	if !ok {
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

// FreezeAsset 冻结资产
func FreezeAsset(c *gin.Context) {
	setAssetStatus(c, false, "freeze", "Asset frozen successfully")
}

// UnfreezeAsset 解冻资产
func UnfreezeAsset(c *gin.Context) {
	setAssetStatus(c, true, "unfreeze", "Asset unfrozen successfully")
}

// 下架资产
func DeactivateAsset(c *gin.Context) {
	setAssetStatus(c, false, "deactivate", "Asset deactivated successfully")
}

func setAssetStatus(c *gin.Context, active bool, action, message string) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	var request struct {
		AssetID string `json:"assetId" binding:"required"`
		Nonce   string `json:"nonce" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !utils.IsValidAssetId(request.AssetID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}
	if err := database.SetAssetStatus(actor, request.AssetID, active, action, request.Nonce); err != nil {
		writeLedgerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "assetId": request.AssetID, "message": message})
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
		if !utils.IsValidAddress(request.Address) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address format"})
			return
		}

		// 添加制裁地址
		if err := sanctionsService.AddToSanctionList(request.Address); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 获取更新后的制裁地址列表
		sanctionedAddresses := sanctionsService.GetSanctionedAddresses()

		c.JSON(http.StatusOK, gin.H{
			"success":             true,
			"message":             "Sanction address added successfully",
			"sanctionedAddresses": sanctionedAddresses,
		})
		return
	}

	// 处理 GET 请求：获取制裁地址列表
	sanctionedAddresses := sanctionsService.GetSanctionedAddresses()

	c.JSON(http.StatusOK, gin.H{
		"success":             true,
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

	jurisdiction, err := database.AddJurisdiction(request.Jurisdiction)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Jurisdiction added successfully",
		"jurisdiction": jurisdiction,
	})
}

// RestrictJurisdiction 限制司法管辖区
func RestrictJurisdiction(c *gin.Context) {
	var request struct {
		Jurisdiction string `json:"jurisdiction" binding:"required"`
		Restricted   bool   `json:"restricted"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	jurisdiction, err := database.RestrictJurisdiction(request.Jurisdiction, request.Restricted)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Jurisdiction restriction updated successfully",
		"jurisdiction": jurisdiction,
		"restricted":   request.Restricted,
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

	jurisdiction, err := database.SetAddressJurisdiction(request.Address, request.Jurisdiction)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Address jurisdiction set successfully",
		"address":      request.Address,
		"jurisdiction": jurisdiction,
	})
}

// GetAddressJurisdiction 获取地址司法管辖区
func GetAddressJurisdiction(c *gin.Context) {
	address, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	jurisdiction, restricted, err := database.GetAddressJurisdiction(address)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"address":      address,
		"jurisdiction": jurisdiction,
		"restricted":   restricted,
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

	// Public registration cannot grant privileged roles.
	request.Role = "investor"

	// 注册用户
	authService := services.NewAuthService()
	err = authService.RegisterUser(request.Username, request.Email, request.Password, request.Address, request.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "User registered successfully",
		"username": request.Username,
		"email":    request.Email,
		"role":     request.Role,
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
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"address":  user.Address,
			"role":     user.Role,
		},
	})
}
