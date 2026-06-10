package database

import (
	"database/sql"
	"log"
	"strings"

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
	DB.SetMaxOpenConns(1)
	if _, err = DB.Exec("PRAGMA foreign_keys = ON"); err != nil {
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
		kyc_verified BOOLEAN NOT NULL DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)
	`)
	if err != nil {
		return err
	}

	// 创建KYC信息表
	_, err = DB.Exec(`
	CREATE TABLE IF NOT EXISTS kyc_information (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_address TEXT UNIQUE NOT NULL,
		desensitized_data TEXT NOT NULL,
		data_hash TEXT NOT NULL,
		verification_id TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_address) REFERENCES users(address)
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
		total_value REAL NOT NULL,
		total_tokens INTEGER NOT NULL,
		token_address TEXT NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT 1
	)
	`)
	if err != nil {
		return err
	}

	_, err = DB.Exec(`
	CREATE TABLE IF NOT EXISTS asset_unit_ledgers (
		asset_id TEXT PRIMARY KEY,
		total_value_units TEXT NOT NULL,
		total_token_units TEXT NOT NULL,
		FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
	);

	CREATE TABLE IF NOT EXISTS user_asset_unit_balances (
		user_address TEXT NOT NULL,
		asset_id TEXT NOT NULL,
		balance_units TEXT NOT NULL DEFAULT '0',
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_address, asset_id),
		FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
	);

	CREATE TABLE IF NOT EXISTS request_nonces (
		nonce TEXT PRIMARY KEY,
		actor_address TEXT NOT NULL,
		action TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS audit_unit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL,
		user_address TEXT NOT NULL,
		asset_id TEXT,
		amount_units TEXT NOT NULL,
		target_address TEXT,
		request_nonce TEXT NOT NULL,
		previous_hash TEXT NOT NULL,
		event_hash TEXT NOT NULL UNIQUE,
		details TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS jurisdictions (
		code TEXT PRIMARY KEY,
		restricted BOOLEAN NOT NULL DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS address_jurisdictions (
		user_address TEXT PRIMARY KEY,
		jurisdiction_code TEXT NOT NULL,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (jurisdiction_code) REFERENCES jurisdictions(code)
	)
	`)
	if err != nil {
		return err
	}
	if _, err = DB.Exec(`
		INSERT OR IGNORE INTO jurisdictions (code) VALUES ('US'), ('CN'), ('EU'), ('JP')
	`); err != nil {
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

// User 用户结构体
type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"` // 不在JSON中返回密码哈希
	Address      string `json:"address"`
	Role         string `json:"role"`
	KYCVerified  bool   `json:"kyc_verified"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// CreateUser 创建新用户
func CreateUser(username, email, passwordHash, address, role string) error {
	// 统一地址格式为小写
	address = strings.ToLower(address)
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
		"SELECT id, username, email, password_hash, address, role, kyc_verified, created_at, updated_at FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.KYCVerified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateKYCVerified 更新用户的KYC验证状态
func UpdateKYCVerified(address string, verified bool) error {
	// 统一地址格式为小写
	address = strings.ToLower(address)
	_, err := DB.Exec(
		"UPDATE users SET kyc_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?",
		verified, address,
	)
	return err
}

// GetKYCVerified 获取用户的KYC验证状态
func GetKYCVerified(address string) (bool, error) {
	// 统一地址格式为小写
	address = strings.ToLower(address)
	var verified bool
	err := DB.QueryRow(
		"SELECT kyc_verified FROM users WHERE address = ?",
		address,
	).Scan(&verified)
	if err != nil {
		return false, err
	}
	return verified, nil
}

// KYCInformation KYC信息结构体
type KYCInformation struct {
	ID               int    `json:"id"`
	UserAddress      string `json:"user_address"`
	DesensitizedData string `json:"desensitized_data"`
	DataHash         string `json:"data_hash"`
	VerificationID   string `json:"verification_id"`
	CreatedAt        string `json:"created_at"`
	UpdatedAt        string `json:"updated_at"`
}

// StoreKYCInformation 存储KYC信息
func StoreKYCInformation(userAddress, desensitizedData, dataHash, verificationID string) error {
	// 统一地址格式为小写
	userAddress = strings.ToLower(userAddress)
	_, err := DB.Exec(
		"INSERT OR REPLACE INTO kyc_information (user_address, desensitized_data, data_hash, verification_id, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
		userAddress, desensitizedData, dataHash, verificationID,
	)
	return err
}

// GetKYCInformation 获取用户的KYC信息
func GetKYCInformation(userAddress string) (*KYCInformation, error) {
	// 统一地址格式为小写
	userAddress = strings.ToLower(userAddress)
	var kycInfo KYCInformation
	err := DB.QueryRow(
		"SELECT id, user_address, desensitized_data, data_hash, verification_id, created_at, updated_at FROM kyc_information WHERE user_address = ?",
		userAddress,
	).Scan(&kycInfo.ID, &kycInfo.UserAddress, &kycInfo.DesensitizedData, &kycInfo.DataHash, &kycInfo.VerificationID, &kycInfo.CreatedAt, &kycInfo.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &kycInfo, nil
}

// GetKYCDataHash 获取用户的KYC数据哈希
func GetKYCDataHash(userAddress string) (string, error) {
	// 统一地址格式为小写
	userAddress = strings.ToLower(userAddress)
	var dataHash string
	err := DB.QueryRow(
		"SELECT data_hash FROM kyc_information WHERE user_address = ?",
		userAddress,
	).Scan(&dataHash)
	if err != nil {
		return "", err
	}
	return dataHash, nil
}

// GetUserByEmail 根据邮箱获取用户
func GetUserByEmail(email string) (*User, error) {
	var user User
	err := DB.QueryRow(
		"SELECT id, username, email, password_hash, address, role, kyc_verified, created_at, updated_at FROM users WHERE email = ?",
		email,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.KYCVerified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByAddress 根据地址获取用户
func GetUserByAddress(address string) (*User, error) {
	// 统一地址格式为小写
	address = strings.ToLower(address)
	var user User
	err := DB.QueryRow(
		"SELECT id, username, email, password_hash, address, role, kyc_verified, created_at, updated_at FROM users WHERE address = ?",
		address,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Address, &user.Role, &user.KYCVerified, &user.CreatedAt, &user.UpdatedAt)
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
	UserAddress  string `json:"userAddress"`
	AssetID      string `json:"assetId"`
	BalanceUnits string `json:"balanceUnits"`
	UpdatedAt    string `json:"updatedAt"`
}
