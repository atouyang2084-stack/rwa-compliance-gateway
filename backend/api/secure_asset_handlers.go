package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"rwaGateway/internal/amount"
	"rwaGateway/internal/database"
	"rwaGateway/internal/services"
	"rwaGateway/utils"
)

func CreateAssetSecure(c *gin.Context) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	var request struct {
		AssetID           string `json:"assetId" binding:"required"`
		Name              string `json:"name" binding:"required"`
		Symbol            string `json:"symbol" binding:"required"`
		InitialValueUnits string `json:"initialValueUnits" binding:"required"`
		Nonce             string `json:"nonce" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !utils.IsValidAssetId(request.AssetID) || !utils.IsValidTokenSymbol(request.Symbol) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset metadata"})
		return
	}
	if _, err := amount.ParsePositiveUnits(request.InitialValueUnits); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	asset := database.Asset{
		AssetID:         request.AssetID,
		Name:            request.Name,
		Symbol:          request.Symbol,
		TotalValueUnits: request.InitialValueUnits,
		TotalTokenUnits: request.InitialValueUnits,
		TokenAddress:    "ledger://" + request.AssetID,
		IsActive:        true,
	}
	if err := database.CreateAsset(actor, request.Nonce, asset); err != nil {
		writeLedgerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"success":           true,
		"assetId":           request.AssetID,
		"initialValueUnits": request.InitialValueUnits,
		"totalTokenUnits":   request.InitialValueUnits,
	})
}

func DepositAssetSecure(c *gin.Context) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	var request struct {
		AssetID    string `json:"assetId" binding:"required"`
		ValueUnits string `json:"valueUnits" binding:"required"`
		Nonce      string `json:"nonce" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !utils.IsValidAssetId(request.AssetID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}
	if !compliantAddress(c, actor) {
		return
	}
	if err := database.DepositUnits(actor, request.AssetID, request.ValueUnits, request.Nonce); err != nil {
		writeLedgerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true, "assetId": request.AssetID, "valueUnits": request.ValueUnits,
		"tokenUnits": request.ValueUnits, "userAddress": actor,
	})
}

func RedeemAssetSecure(c *gin.Context) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	var request struct {
		AssetID    string `json:"assetId" binding:"required"`
		TokenUnits string `json:"tokenUnits" binding:"required"`
		Nonce      string `json:"nonce" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !utils.IsValidAssetId(request.AssetID) || !compliantAddress(c, actor) {
		if !utils.IsValidAssetId(request.AssetID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		}
		return
	}
	if err := database.RedeemUnits(actor, request.AssetID, request.TokenUnits, request.Nonce); err != nil {
		writeLedgerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true, "assetId": request.AssetID, "tokenUnits": request.TokenUnits,
		"valueUnits": request.TokenUnits, "userAddress": actor,
	})
}

func TransferAssetSecure(c *gin.Context) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	var request struct {
		AssetID     string `json:"assetId" binding:"required"`
		ToAddress   string `json:"toAddress" binding:"required"`
		AmountUnits string `json:"amountUnits" binding:"required"`
		Nonce       string `json:"nonce" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !utils.IsValidAssetId(request.AssetID) || !utils.IsValidAddress(request.ToAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID or recipient address"})
		return
	}
	if !compliantAddress(c, actor) || !compliantAddress(c, request.ToAddress) {
		return
	}
	if err := database.TransferUnits(actor, request.ToAddress, request.AssetID, request.AmountUnits, request.Nonce); err != nil {
		writeLedgerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true, "assetId": request.AssetID, "from": actor,
		"to": request.ToAddress, "amountUnits": request.AmountUnits,
	})
}

func GetAssetsSecure(c *gin.Context) {
	assets, err := database.GetAllAssets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	response := make([]gin.H, 0, len(assets))
	for _, asset := range assets {
		response = append(response, gin.H{
			"assetId": asset.AssetID, "name": asset.Name, "symbol": asset.Symbol,
			"totalValueUnits": asset.TotalValueUnits, "totalTokenUnits": asset.TotalTokenUnits,
			"tokenAddress": asset.TokenAddress, "isActive": asset.IsActive,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "assets": response})
}

func GetAssetDetailsSecure(c *gin.Context) {
	assetID := c.Query("assetId")
	if !utils.IsValidAssetId(assetID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}
	asset, err := database.GetAssetByID(assetID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "asset": gin.H{
		"assetId": asset.AssetID, "name": asset.Name, "symbol": asset.Symbol,
		"totalValueUnits": asset.TotalValueUnits, "totalTokenUnits": asset.TotalTokenUnits,
		"tokenAddress": asset.TokenAddress, "isActive": asset.IsActive,
	}})
}

func GetUserBalancesSecure(c *gin.Context) {
	actor, ok := authenticatedAddress(c)
	if !ok {
		return
	}
	balances, err := database.UnitBalances(actor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "balances": balances})
}

func GetAssetTotalBalanceSecure(c *gin.Context) {
	assetID := c.Query("assetId")
	if !utils.IsValidAssetId(assetID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID format"})
		return
	}
	total, err := database.UnitTotalBalance(assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "assetId": assetID, "totalBalanceUnits": total})
}

func compliantAddress(c *gin.Context, address string) bool {
	sanctioned, err := services.NewSanctionsService().IsAddressSanctioned(address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check sanction status"})
		return false
	}
	if sanctioned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Address is sanctioned"})
		return false
	}
	verified, err := database.GetKYCVerified(address)
	if err != nil || !verified {
		c.JSON(http.StatusForbidden, gin.H{"error": "KYC verification required"})
		return false
	}
	return true
}

func writeLedgerError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, database.ErrDuplicateRequest):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case err.Error() == "asset not found":
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}
