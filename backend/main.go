package main

import (
	"fmt"
	"log"
	"rwaGateway/api"
	"rwaGateway/config"
	"rwaGateway/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	log.Println("Starting backend service...")

	// 加载环境变量
	log.Println("Loading environment variables...")
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	} else {
		log.Println("Environment variables loaded successfully")
	}

	// 初始化配置
	log.Println("Loading configuration...")
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	log.Printf("Configuration loaded successfully: Port=%s, Environment=%s", cfg.Port, cfg.Environment)

	// 初始化数据库
	log.Println("Initializing database...")
	databaseURL := cfg.DatabaseURL
	if databaseURL == "" {
		// 默认使用SQLite数据库文件
		databaseURL = "./rwa_gateway.db"
	}
	log.Printf("Using database URL: %s", databaseURL)
	if err := database.InitDatabase(databaseURL); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// 设置Gin模式
	log.Println("Setting Gin mode...")
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
		log.Println("Gin mode set to Release")
	} else {
		gin.SetMode(gin.DebugMode)
		log.Println("Gin mode set to Debug")
	}

	// 创建Gin引擎
	log.Println("Creating Gin engine...")
	r := gin.Default()

	log.Println("Gin engine created successfully")

	// 注册API路由
	log.Println("Registering API routes...")
	api.RegisterRoutes(r)
	log.Println("API routes registered successfully")

	// 启动服务器
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
