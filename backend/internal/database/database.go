package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDatabase 初始化数据库连接
func InitDatabase(databaseURL string) error {
	var err error
	DB, err = sql.Open("sqlite3", databaseURL)
	if err != nil {
		return err
	}

	// 测试连接
	if err = DB.Ping(); err != nil {
		return err
	}

	// 创建表
	if err = createTables(); err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

// createTables 创建数据库表
func createTables() error {
	// 创建资产表
	_, err := DB.Exec(`
	CREATE TABLE IF NOT EXISTS assets (
		asset_id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		symbol TEXT NOT NULL,
		total_value INTEGER NOT NULL,
		total_tokens INTEGER NOT NULL,
		token_address TEXT NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT 1
	)
	`)
	return err
}

// Close 关闭数据库连接
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// UpdateAssetStatus 更新资产状态
func UpdateAssetStatus(assetId string, isActive bool) error {
	_, err := DB.Exec(
		"UPDATE assets SET is_active = ? WHERE asset_id = ?",
		isActive,
		assetId,
	)
	return err
}
