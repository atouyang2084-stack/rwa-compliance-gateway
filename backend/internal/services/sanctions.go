package services

import (
	"log"
	"os"
	"strings"
	"sync"
)

// 全局制裁地址 map
var globalSanctionedAddresses = make(map[string]bool)
var sanctionsMutex sync.RWMutex

// SanctionsService 制裁名单服务
type SanctionsService struct{}

// NewSanctionsService 创建制裁名单服务实例
func NewSanctionsService() *SanctionsService {
	service := &SanctionsService{}
	service.initializeDemoSanctions()
	return service
}

func (s *SanctionsService) initializeDemoSanctions() {
	if strings.ToLower(os.Getenv("SANCTIONS_MODE")) != "demo" {
		return
	}
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()

	if len(globalSanctionedAddresses) == 0 {
		globalSanctionedAddresses["0x1234567890123456789012345678901234567890"] = true
		globalSanctionedAddresses["0x0987654321098765432109876543210987654321"] = true
		globalSanctionedAddresses["0xabcdef1234567890abcdef1234567890abcdef12"] = true
	}
}

// IsAddressSanctioned 检查地址是否在制裁名单中
func (s *SanctionsService) IsAddressSanctioned(address string) (bool, error) {
	// 检查地址是否在制裁名单中
	sanctionsMutex.RLock()
	defer sanctionsMutex.RUnlock()

	isSanctioned := globalSanctionedAddresses[strings.ToLower(address)]
	if isSanctioned {
		log.Printf("Sanctioned address detected: %s", address)
	}
	return isSanctioned, nil
}

// AddToSanctionList 手动添加地址到制裁名单
func (s *SanctionsService) AddToSanctionList(address string) error {
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()

	globalSanctionedAddresses[strings.ToLower(address)] = true
	log.Printf("Address added to sanction list: %s", address)
	return nil
}

// RemoveFromSanctionList 从制裁名单中移除地址
func (s *SanctionsService) RemoveFromSanctionList(address string) error {
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()

	delete(globalSanctionedAddresses, strings.ToLower(address))
	return nil
}

// GetSanctionedAddresses 获取所有制裁地址
func (s *SanctionsService) GetSanctionedAddresses() []string {
	sanctionsMutex.RLock()
	defer sanctionsMutex.RUnlock()

	var addresses []string
	for addr := range globalSanctionedAddresses {
		addresses = append(addresses, addr)
	}
	return addresses
}
