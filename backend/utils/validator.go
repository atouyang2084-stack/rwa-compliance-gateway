package utils

import (
	"regexp"
	"strings"
)

// 输入验证工具

// 验证以太坊地址格式
func IsValidAddress(address string) bool {
	if address == "" {
		return false
	}
	// 以太坊地址格式：0x开头，后面40个十六进制字符
	match, _ := regexp.MatchString(`^0x[a-fA-F0-9]{40}$`, address)
	return match
}

// 验证邮箱格式
func IsValidEmail(email string) bool {
	if email == "" {
		return false
	}
	match, _ := regexp.MatchString(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, email)
	return match
}

// 验证资产ID格式
func IsValidAssetId(assetId string) bool {
	if assetId == "" {
		return false
	}
	// 资产ID：字母、数字、连字符、下划线，长度1-64
	match, _ := regexp.MatchString(`^[a-zA-Z0-9-_]{1,64}$`, assetId)
	return match
}

// 验证代币符号格式
func IsValidTokenSymbol(symbol string) bool {
	if symbol == "" {
		return false
	}
	// 代币符号：字母，长度2-10
	match, _ := regexp.MatchString(`^[A-Z]{2,10}$`, strings.ToUpper(symbol))
	return match
}

// 验证金额
func IsValidAmount(amount int64) bool {
	return amount > 0 && amount <= 1000000000000 // 最大1万亿
}

// 验证KYC数据
func IsValidKYCData(data string) bool {
	if data == "" {
		return false
	}
	// 基本长度检查
	if len(data) < 10 || len(data) > 10000 {
		return false
	}
	return true
}

// 验证姓名
func IsValidName(name string) bool {
	if name == "" {
		return false
	}
	// 姓名：字母、空格、连字符，长度2-50
	match, _ := regexp.MatchString(`^[a-zA-Z\s\-]{2,50}$`, name)
	return match
}

// 验证日期格式
func IsValidDate(date string) bool {
	if date == "" {
		return false
	}
	// 日期格式：YYYY-MM-DD
	match, _ := regexp.MatchString(`^\d{4}-\d{2}-\d{2}$`, date)
	return match
}

// 清理输入（去除特殊字符）
func SanitizeInput(input string) string {
	// 去除首尾空白
	input = strings.TrimSpace(input)
	// 去除HTML标签
	re := regexp.MustCompile(`<[^>]*>`)
	input = re.ReplaceAllString(input, "")
	return input
}

// 验证交易哈希格式
func IsValidTxHash(txHash string) bool {
	if txHash == "" {
		return false
	}
	// 交易哈希：0x开头，后面64个十六进制字符
	match, _ := regexp.MatchString(`^0x[a-fA-F0-9]{64}$`, txHash)
	return match
}

// 验证URL格式
func IsValidUrl(url string) bool {
	if url == "" {
		return false
	}
	match, _ := regexp.MatchString(`^https?://[^\s/$.?#].[^\s]*$`, url)
	return match
}

// 验证白名单地址格式
func IsValidWhitelistAddress(address string) bool {
	if address == "" {
		return false
	}
	// 支持以太坊地址和以太坊 ENS 域名
	if strings.HasPrefix(address, "0x") {
		return IsValidAddress(address)
	}
	// ENS 域名格式
	match, _ := regexp.MatchString(`^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$`, address)
	return match
}
