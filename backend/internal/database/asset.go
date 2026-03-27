package database

import (
	"database/sql"
	"fmt"
)

// Asset 资产结构
type Asset struct {
	AssetID      string
	Name         string
	Symbol       string
	TotalValue   uint64
	TotalTokens  uint64
	TokenAddress string
	IsActive     bool
}

// CreateAsset 创建新资产
func CreateAsset(asset Asset) error {
	_, err := DB.Exec(
		"INSERT INTO assets (asset_id, name, symbol, total_value, total_tokens, token_address, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
		asset.AssetID, asset.Name, asset.Symbol, asset.TotalValue, asset.TotalTokens, asset.TokenAddress, asset.IsActive,
	)
	return err
}

// GetAllAssets 获取所有资产
func GetAllAssets() ([]Asset, error) {
	rows, err := DB.Query("SELECT asset_id, name, symbol, total_value, total_tokens, token_address, is_active FROM assets")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		if err := rows.Scan(&asset.AssetID, &asset.Name, &asset.Symbol, &asset.TotalValue, &asset.TotalTokens, &asset.TokenAddress, &asset.IsActive); err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}

	return assets, nil
}

// GetAssetByID 根据资产ID获取资产
func GetAssetByID(assetID string) (Asset, error) {
	var asset Asset
	err := DB.QueryRow("SELECT asset_id, name, symbol, total_value, total_tokens, token_address, is_active FROM assets WHERE asset_id = ?", assetID).Scan(
		&asset.AssetID, &asset.Name, &asset.Symbol, &asset.TotalValue, &asset.TotalTokens, &asset.TokenAddress, &asset.IsActive,
	)
	if err == sql.ErrNoRows {
		return asset, fmt.Errorf("asset not found")
	}
	return asset, err
}

// UpdateAssetValue 更新资产价值
func UpdateAssetValue(assetID string, value uint64, isDeposit bool) error {
	var err error
	if isDeposit {
		_, err = DB.Exec(
			"UPDATE assets SET total_value = total_value + ? WHERE asset_id = ?",
			value, assetID,
		)
	} else {
		_, err = DB.Exec(
			"UPDATE assets SET total_value = total_value - ? WHERE asset_id = ?",
			value, assetID,
		)
	}
	return err
}

// UpdateAssetTokens 更新资产代币总量
func UpdateAssetTokens(assetID string, tokens uint64, isDeposit bool) error {
	var err error
	if isDeposit {
		_, err = DB.Exec(
			"UPDATE assets SET total_tokens = total_tokens + ? WHERE asset_id = ?",
			tokens, assetID,
		)
	} else {
		_, err = DB.Exec(
			"UPDATE assets SET total_tokens = total_tokens - ? WHERE asset_id = ?",
			tokens, assetID,
		)
	}
	return err
}
