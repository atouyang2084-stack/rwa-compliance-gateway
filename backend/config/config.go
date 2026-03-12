package config

import (
	"os"
)

type Config struct {
	Port      string
	Environment string
	EthereumRPCURL string
	PolygonRPCURL string
	ChainID   string
	ComplianceRegistryAddress string
	KYCServieAPIKey string
	KYCServieEndpoint string
	OFACAPIKey string
	OFACAPIEndpoint string
	JWTSecret string
	JWTExpiration string
	DatabaseURL string
	HSMKeyID string
	MPCThreshold string
	MPCTotalSigners string
	CircuitBreakerEnabled string
	CircuitBreakerThreshold string
	OracleAPIKey string
	OracleEndpoint string
}

func LoadConfig() (*Config, error) {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		EthereumRPCURL: getEnv("ETHEREUM_RPC_URL", ""),
		PolygonRPCURL: getEnv("POLYGON_RPC_URL", ""),
		ChainID:   getEnv("CHAIN_ID", "1"),
		ComplianceRegistryAddress: getEnv("COMPLIANCE_REGISTRY_ADDRESS", ""),
		KYCServieAPIKey: getEnv("KYC_SERVICE_API_KEY", ""),
		KYCServieEndpoint: getEnv("KYC_SERVICE_ENDPOINT", ""),
		OFACAPIKey: getEnv("OFAC_API_KEY", ""),
		OFACAPIEndpoint: getEnv("OFAC_API_ENDPOINT", ""),
		JWTSecret: getEnv("JWT_SECRET", ""),
		JWTExpiration: getEnv("JWT_EXPIRATION", "24h"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		HSMKeyID: getEnv("HSM_KEY_ID", ""),
		MPCThreshold: getEnv("MPC_THRESHOLD", "3"),
		MPCTotalSigners: getEnv("MPC_TOTAL_SIGNERS", "5"),
		CircuitBreakerEnabled: getEnv("CIRCUIT_BREAKER_ENABLED", "true"),
		CircuitBreakerThreshold: getEnv("CIRCUIT_BREAKER_THRESHOLD", "5"),
		OracleAPIKey: getEnv("ORACLE_API_KEY", ""),
		OracleEndpoint: getEnv("ORACLE_ENDPOINT", ""),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
