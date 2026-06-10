package database

import (
	"database/sql"
	"fmt"
	"strings"

	"rwaGateway/internal/amount"
)

// Asset 资产结构
type Asset struct {
	AssetID         string
	Name            string
	Symbol          string
	TotalValueUnits string
	TotalTokenUnits string
	TokenAddress    string
	IsActive        bool
}

// CreateAsset 创建新资产
func CreateAsset(actor, nonce string, asset Asset) error {
	if _, err := amount.ParsePositiveUnits(asset.TotalValueUnits); err != nil {
		return err
	}
	if _, err := amount.ParsePositiveUnits(asset.TotalTokenUnits); err != nil {
		return err
	}
	actor = strings.ToLower(actor)
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := consumeNonce(tx, nonce, actor, "create_asset"); err != nil {
		return err
	}
	if _, err = tx.Exec(
		"INSERT INTO assets (asset_id, name, symbol, total_value, total_tokens, token_address, is_active) VALUES (?, ?, ?, 0, 0, ?, ?)",
		asset.AssetID, asset.Name, asset.Symbol, asset.TokenAddress, asset.IsActive,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(
		"INSERT INTO asset_unit_ledgers (asset_id, total_value_units, total_token_units) VALUES (?, ?, ?)",
		asset.AssetID, asset.TotalValueUnits, asset.TotalTokenUnits,
	); err != nil {
		return err
	}
	if err := insertUnitAudit(
		tx, "create_asset", actor, asset.AssetID, asset.TotalValueUnits,
		asset.TokenAddress, nonce, "Asset created with a 1:1 smallest-unit peg",
	); err != nil {
		return err
	}
	return tx.Commit()
}

// GetAllAssets 获取所有资产
func GetAllAssets() ([]Asset, error) {
	rows, err := DB.Query(`
		SELECT a.asset_id, a.name, a.symbol, l.total_value_units, l.total_token_units, a.token_address, a.is_active
		FROM assets a JOIN asset_unit_ledgers l ON l.asset_id = a.asset_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		if err := rows.Scan(&asset.AssetID, &asset.Name, &asset.Symbol, &asset.TotalValueUnits, &asset.TotalTokenUnits, &asset.TokenAddress, &asset.IsActive); err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}

	return assets, nil
}

// GetAssetByID 根据资产ID获取资产
func GetAssetByID(assetID string) (Asset, error) {
	var asset Asset
	err := DB.QueryRow(`
		SELECT a.asset_id, a.name, a.symbol, l.total_value_units, l.total_token_units, a.token_address, a.is_active
		FROM assets a JOIN asset_unit_ledgers l ON l.asset_id = a.asset_id
		WHERE a.asset_id = ?
	`, assetID).Scan(
		&asset.AssetID, &asset.Name, &asset.Symbol, &asset.TotalValueUnits, &asset.TotalTokenUnits, &asset.TokenAddress, &asset.IsActive,
	)
	if err == sql.ErrNoRows {
		return asset, fmt.Errorf("asset not found")
	}
	return asset, err
}
