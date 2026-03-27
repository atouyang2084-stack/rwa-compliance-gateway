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
	// 创建用户表
	_, err := DB.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		address TEXT UNIQUE NOT NULL,
		role TEXT NOT NULL DEFAULT 'investor',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)
	`)
	if err != nil {
		return err
	}

	// 创建资产表
	_, err = DB.Exec(`
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
	if err != nil {
		return err
	}

	// 创建用户资产余额表
	_, err = DB.Exec(`
	CREATE TABLE IF NOT EXISTS user_asset_balances (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_address TEXT NOT NULL,
		asset_id TEXT NOT NULL,
		balance INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_address, asset_id),
		FOREIGN KEY (user_address) REFERENCES users(address),
		FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
	)
	`)
	if err != nil {
		return err
	}

	// 创建审计记录表
	_, err = DB.Exec(`
	CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL,
		user_address TEXT NOT NULL,
		asset_id TEXT,
		amount INTEGER,
		target_address TEXT,
		details TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// User 用户结构体
type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"` // 不在JSON中返回密码哈希
	Address      string `json:"address"`
	Role         string `json:"role"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// CreateUser 创建新用户
func CreateUser(username, email, passwordHash, address, role string) error {
	_, err := DB.Exec(
		"INSERT INTO users (username, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)",
		username, email, passwordHash, address, role,
	)
	return err
}

// GetUserByUsername 根据用户名获取用户
func GetUserByUsername(username string) (*User, error) {
	var user User
	err := DB.QueryRow(
		"SELECT id, username, email, password_hash, address, role, created_at, updated_at FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail 根据邮箱获取用户
func GetUserByEmail(email string) (*User, error) {
	var user User
	err := DB.QueryRow(
		"SELECT id, username, email, password_hash, address, role, created_at, updated_at FROM users WHERE email = ?",
		email,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByAddress 根据地址获取用户
func GetUserByAddress(address string) (*User, error) {
	var user User
	err := DB.QueryRow(
		"SELECT id, username, email, password_hash, address, role, created_at, updated_at FROM users WHERE address = ?",
		address,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUserRole 更新用户角色
func UpdateUserRole(username, role string) error {
	_, err := DB.Exec(
		"UPDATE users SET role = ? WHERE username = ?",
		role, username,
	)
	return err
}

// UserAssetBalance 用户资产余额结构体
type UserAssetBalance struct {
	ID          int    `json:"id"`
	UserAddress string `json:"user_address"`
	AssetID     string `json:"asset_id"`
	Balance     int    `json:"balance"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// GetUserAssetBalance 获取用户的资产余额
func GetUserAssetBalance(userAddress, assetId string) (int, error) {
	var balance int
	err := DB.QueryRow(
		"SELECT balance FROM user_asset_balances WHERE user_address = ? AND asset_id = ?",
		userAddress, assetId,
	).Scan(&balance)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return balance, err
}

// UpdateUserAssetBalance 更新用户的资产余额
func UpdateUserAssetBalance(userAddress, assetId string, amount int) error {
	// 尝试更新余额
	result, err := DB.Exec(
		"UPDATE user_asset_balances SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_address = ? AND asset_id = ?",
		amount, userAddress, assetId,
	)
	if err != nil {
		return err
	}

	// 检查是否有记录被更新
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	// 如果没有记录被更新，创建新记录
	if rowsAffected == 0 {
		_, err = DB.Exec(
			"INSERT INTO user_asset_balances (user_address, asset_id, balance) VALUES (?, ?, ?)",
			userAddress, assetId, amount,
		)
	}

	return err
}

// GetUserBalances 获取用户的所有资产余额
func GetUserBalances(userAddress string) ([]UserAssetBalance, error) {
	rows, err := DB.Query(
		"SELECT id, user_address, asset_id, balance, created_at, updated_at FROM user_asset_balances WHERE user_address = ?",
		userAddress,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var balances []UserAssetBalance
	for rows.Next() {
		var balance UserAssetBalance
		err := rows.Scan(&balance.ID, &balance.UserAddress, &balance.AssetID, &balance.Balance, &balance.CreatedAt, &balance.UpdatedAt)
		if err != nil {
			return nil, err
		}
		balances = append(balances, balance)
	}

	return balances, nil
}

// GetAllUserAssetBalances 获取所有用户的特定资产余额
func GetAllUserAssetBalances(assetId string) ([]UserAssetBalance, error) {
	rows, err := DB.Query(
		"SELECT id, user_address, asset_id, balance, created_at, updated_at FROM user_asset_balances WHERE asset_id = ?",
		assetId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var balances []UserAssetBalance
	for rows.Next() {
		var balance UserAssetBalance
		err := rows.Scan(&balance.ID, &balance.UserAddress, &balance.AssetID, &balance.Balance, &balance.CreatedAt, &balance.UpdatedAt)
		if err != nil {
			return nil, err
		}
		balances = append(balances, balance)
	}

	return balances, nil
}

// AuditLog 审计日志结构体
type AuditLog struct {
	ID            int    `json:"id"`
	Action        string `json:"action"`
	UserAddress   string `json:"user_address"`
	AssetID       string `json:"asset_id"`
	Amount        int    `json:"amount"`
	TargetAddress string `json:"target_address"`
	Details       string `json:"details"`
	CreatedAt     string `json:"created_at"`
}

// CreateAuditLog 创建审计日志
func CreateAuditLog(action, userAddress, assetId string, amount int, targetAddress, details string) error {
	_, err := DB.Exec(
		"INSERT INTO audit_logs (action, user_address, asset_id, amount, target_address, details) VALUES (?, ?, ?, ?, ?, ?)",
		action, userAddress, assetId, amount, targetAddress, details,
	)
	return err
}

// GetAssetAuditLogs 获取资产的审计日志
func GetAssetAuditLogs(assetId string) ([]AuditLog, error) {
	rows, err := DB.Query(
		"SELECT id, action, user_address, asset_id, amount, target_address, details, created_at FROM audit_logs WHERE asset_id = ? ORDER BY created_at DESC",
		assetId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var log AuditLog
		err := rows.Scan(&log.ID, &log.Action, &log.UserAddress, &log.AssetID, &log.Amount, &log.TargetAddress, &log.Details, &log.CreatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}
