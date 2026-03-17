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
