package services

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// 全局制裁地址 map
var globalSanctionedAddresses = make(map[string]bool)
var sanctionsMutex sync.RWMutex

// SanctionsService 制裁名单服务
type SanctionsService struct {
	apiKey     string
	apiBaseURL string
	client     *http.Client
}

// NewSanctionsService 创建制裁名单服务实例
func NewSanctionsService() *SanctionsService {
	service := &SanctionsService{
		apiKey:     os.Getenv("OFAC_API_KEY"),
		apiBaseURL: os.Getenv("OFAC_API_ENDPOINT"),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
	
	// 初始化默认的制裁地址（临时方案）
	service.initializeDefaultSanctions()
	
	return service
}

// 初始化默认的制裁地址（临时方案）
func (s *SanctionsService) initializeDefaultSanctions() {
	// 模拟一些制裁地址
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()
	
	// 只有当全局制裁地址 map 为空时才初始化
	if len(globalSanctionedAddresses) == 0 {
		globalSanctionedAddresses["0x1234567890123456789012345678901234567890"] = true
		globalSanctionedAddresses["0x0987654321098765432109876543210987654321"] = true
		globalSanctionedAddresses["0xabcdef1234567890abcdef1234567890abcdef12"] = true
	}
}

// SyncSanctionList 同步制裁名单
func (s *SanctionsService) SyncSanctionList() error {
	// 临时方案：模拟同步过程
	// 实际项目中应该调用真实的OFAC API
	fmt.Println("Syncing sanction list...")
	
	// 模拟API调用延迟
	time.Sleep(1 * time.Second)
	
	// 模拟同步成功
	fmt.Println("Sanction list synced successfully")
	return nil
}

// IsAddressSanctioned 检查地址是否在制裁名单中
func (s *SanctionsService) IsAddressSanctioned(address string) (bool, error) {
	// 检查地址是否在制裁名单中
	sanctionsMutex.RLock()
	defer sanctionsMutex.RUnlock()
	
	isSanctioned := globalSanctionedAddresses[address]
	if isSanctioned {
		log.Printf("Sanctioned address detected: %s", address)
	}
	return isSanctioned, nil
}

// AddToSanctionList 手动添加地址到制裁名单
func (s *SanctionsService) AddToSanctionList(address string) error {
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()
	
	globalSanctionedAddresses[address] = true
	log.Printf("Address added to sanction list: %s", address)
	return nil
}

// RemoveFromSanctionList 从制裁名单中移除地址
func (s *SanctionsService) RemoveFromSanctionList(address string) error {
	sanctionsMutex.Lock()
	defer sanctionsMutex.Unlock()
	
	delete(globalSanctionedAddresses, address)
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