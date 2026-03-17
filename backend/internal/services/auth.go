package services

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"rwaGateway/internal/database"
)

// AuthService 认证服务
type AuthService struct {
	jwtSecret string
}

// NewAuthService 创建认证服务实例
func NewAuthService() *AuthService {
	return &AuthService{
		jwtSecret: os.Getenv("JWT_SECRET"),
	}
}

// RegisterUser 注册新用户
func (s *AuthService) RegisterUser(username, email, password, address, role string) error {
	// 检查用户是否已存在
	_, err := database.GetUserByUsername(username)
	if err == nil {
		return errors.New("username already exists")
	}

	_, err = database.GetUserByEmail(email)
	if err == nil {
		return errors.New("email already exists")
	}

	_, err = database.GetUserByAddress(address)
	if err == nil {
		return errors.New("address already exists")
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// 创建用户
	return database.CreateUser(username, email, string(hashedPassword), address, role)
}

// LoginUser 用户登录
func (s *AuthService) LoginUser(username, password string) (string, *database.User, error) {
	// 获取用户
	user, err := database.GetUserByUsername(username)
	if err != nil {
		return "", nil, errors.New("invalid username or password")
	}

	// 验证密码
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", nil, errors.New("invalid username or password")
	}

	// 生成JWT令牌
	token, err := s.GenerateToken(user)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// GenerateToken 生成JWT令牌
func (s *AuthService) GenerateToken(user *database.User) (string, error) {
	// 设置JWT声明
	claims := jwt.MapClaims{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"address":  user.Address,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(), // 7天过期
	}

	// 创建令牌
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 签名令牌
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken 验证JWT令牌
func (s *AuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	// 解析令牌
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	// 验证令牌有效性
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GetUserRoleFromToken 从令牌中获取用户角色
func (s *AuthService) GetUserRoleFromToken(tokenString string) (string, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	role, ok := claims["role"].(string)
	if !ok {
		return "", errors.New("role not found in token")
	}

	return role, nil
}