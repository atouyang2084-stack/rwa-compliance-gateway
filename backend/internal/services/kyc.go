package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"rwaGateway/internal/database"
)

// OnfidoAPI 结构体用于与Onfido API交互
type OnfidoAPI struct {
	apiKey     string
	apiBaseURL string
	client     *http.Client
}

// NewOnfidoAPI 创建一个新的OnfidoAPI实例
func NewOnfidoAPI() *OnfidoAPI {
	return &OnfidoAPI{
		apiKey:     os.Getenv("KYC_SERVICE_API_KEY"),
		apiBaseURL: os.Getenv("KYC_SERVICE_ENDPOINT"),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// OnfidoApplicant 申请人结构体
type OnfidoApplicant struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	Dob       string    `json:"dob"`
	Address   *Address  `json:"address,omitempty"`
}

// Address 地址结构体
type Address struct {
	BuildingNumber string `json:"building_number"`
	Street         string `json:"street"`
	Town           string `json:"town"`
	Postcode       string `json:"postcode"`
	Country        string `json:"country"`
}

// OnfidoCheck 检查结构体
type OnfidoCheck struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
	Result    *Result   `json:"result,omitempty"`
}

// Result 结果结构体
type Result struct {
	Status string `json:"status"`
}

// OnfidoWebhook 网络钩子结构体
type OnfidoWebhook struct {
	Payload struct {
		Resource struct {
			ID     string `json:"id"`
			Type   string `json:"type"`
			Action string `json:"action"`
		} `json:"resource"`
	} `json:"payload"`
}

// CreateApplicant 创建申请人
func (api *OnfidoAPI) CreateApplicant(firstName, lastName, email, dob string) (*OnfidoApplicant, error) {
	url := fmt.Sprintf("%s/applicants", api.apiBaseURL)

	requestBody := map[string]interface{}{
		"first_name": firstName,
		"last_name":  lastName,
		"email":      email,
		"dob":        dob,
	}

	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Token token=%s", api.apiKey))

	resp, err := api.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("failed to create applicant: status code %d", resp.StatusCode)
	}

	var applicant OnfidoApplicant
	if err := json.NewDecoder(resp.Body).Decode(&applicant); err != nil {
		return nil, err
	}

	return &applicant, nil
}

// CreateCheck 创建检查
func (api *OnfidoAPI) CreateCheck(applicantID string) (*OnfidoCheck, error) {
	url := fmt.Sprintf("%s/applicants/%s/checks", api.apiBaseURL, applicantID)

	requestBody := map[string]interface{}{
		"type":         "standard",
		"report_names": []string{"identity_enhanced", "document"},
	}

	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Token token=%s", api.apiKey))

	resp, err := api.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("failed to create check: status code %d", resp.StatusCode)
	}

	var check OnfidoCheck
	if err := json.NewDecoder(resp.Body).Decode(&check); err != nil {
		return nil, err
	}

	return &check, nil
}

// GetCheck 获取检查状态
func (api *OnfidoAPI) GetCheck(checkID string) (*OnfidoCheck, error) {
	url := fmt.Sprintf("%s/checks/%s", api.apiBaseURL, checkID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Token token=%s", api.apiKey))

	resp, err := api.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get check: status code %d", resp.StatusCode)
	}

	var check OnfidoCheck
	if err := json.NewDecoder(resp.Body).Decode(&check); err != nil {
		return nil, err
	}

	return &check, nil
}

// VerifyKYC 验证KYC信息
func (api *OnfidoAPI) VerifyKYC(userAddress, verificationData string) (bool, string, error) {
	// 解析验证数据
	var data map[string]string
	if err := json.Unmarshal([]byte(verificationData), &data); err != nil {
		return false, "", err
	}

	required := []string{"firstName", "lastName", "email", "dob"}
	for _, field := range required {
		if strings.TrimSpace(data[field]) == "" {
			return false, "", fmt.Errorf("%s is required", field)
		}
	}

	desensitizedData := api.desensitizeData(data)
	dataHash := api.generateDataHash(data)

	var verificationID string
	switch strings.ToLower(os.Getenv("KYC_MODE")) {
	case "demo":
		verificationID = "DEMO-KYC-" + dataHash[:16]
	default:
		if api.apiKey == "" || api.apiBaseURL == "" {
			return false, "", errors.New("KYC provider is not configured; set KYC_MODE=demo for local showcase")
		}
		applicant, err := api.CreateApplicant(
			data["firstName"], data["lastName"], data["email"], data["dob"],
		)
		if err != nil {
			return false, "", err
		}
		check, err := api.CreateCheck(applicant.ID)
		if err != nil {
			return false, "", err
		}
		verificationID = check.ID
		verified, err := api.waitForCheck(check.ID)
		if err != nil {
			return false, "", err
		}
		if !verified {
			return false, verificationID, nil
		}
	}

	// 存储KYC信息到数据库
	desensitizedDataJSON, err := json.Marshal(desensitizedData)
	if err != nil {
		return false, "", err
	}

	err = database.StoreKYCInformation(userAddress, string(desensitizedDataJSON), dataHash, verificationID)
	if err != nil {
		return false, "", err
	}

	return true, verificationID, nil
}

func (api *OnfidoAPI) waitForCheck(checkID string) (bool, error) {
	const attempts = 10
	for attempt := 0; attempt < attempts; attempt++ {
		check, err := api.GetCheck(checkID)
		if err != nil {
			return false, err
		}
		switch check.Status {
		case "complete":
			return check.Result != nil && check.Result.Status == "clear", nil
		case "withdrawn", "cancelled":
			return false, nil
		}
		time.Sleep(2 * time.Second)
	}
	return false, errors.New("KYC provider timed out")
}

// IsKYCVerified 检查用户是否已经完成KYC验证
func (api *OnfidoAPI) IsKYCVerified(userAddress string) (bool, error) {
	// 查询数据库中的KYC验证状态
	verified, err := database.GetKYCVerified(userAddress)
	if err != nil {
		// 如果数据库中没有记录，返回false
		return false, err
	}
	return verified, nil
}

// desensitizeData 对敏感数据进行脱敏处理
func (api *OnfidoAPI) desensitizeData(data map[string]string) map[string]string {
	desensitized := make(map[string]string)

	for key, value := range data {
		switch key {
		case "passport":
			// 护照号脱敏：保留前3位和后4位
			if len(value) > 7 {
				desensitized[key] = value[:3] + strings.Repeat("*", len(value)-7) + value[len(value)-4:]
			} else {
				desensitized[key] = value
			}
		case "idCard":
			// 身份证号脱敏：保留前3位和后4位
			if len(value) > 7 {
				desensitized[key] = value[:3] + strings.Repeat("*", len(value)-7) + value[len(value)-4:]
			} else {
				desensitized[key] = value
			}
		case "firstName":
			// 名字脱敏：保留第一个字符
			if len(value) > 1 {
				desensitized[key] = string(value[0]) + strings.Repeat("*", len(value)-1)
			} else {
				desensitized[key] = value
			}
		case "lastName":
			// 姓氏脱敏：保留第一个字符
			if len(value) > 1 {
				desensitized[key] = string(value[0]) + strings.Repeat("*", len(value)-1)
			} else {
				desensitized[key] = value
			}
		case "email":
			// 邮箱脱敏：保留用户名前3位和域名
			parts := strings.Split(value, "@")
			if len(parts) == 2 {
				username := parts[0]
				domain := parts[1]
				if len(username) > 3 {
					desensitized[key] = username[:3] + strings.Repeat("*", len(username)-3) + "@" + domain
				} else {
					desensitized[key] = username + "@" + domain
				}
			} else {
				desensitized[key] = value
			}
		case "dob":
			// 出生日期脱敏：只保留年份
			if len(value) >= 4 {
				desensitized[key] = value[:4] + "-**-**"
			} else {
				desensitized[key] = value
			}
		default:
			desensitized[key] = value
		}
	}

	return desensitized
}

// generateDataHash 生成数据哈希
func (api *OnfidoAPI) generateDataHash(data map[string]string) string {
	// 将数据转换为JSON字符串
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return ""
	}

	// 生成SHA-256哈希
	hash := sha256.Sum256(dataBytes)

	// 返回十六进制字符串
	return hex.EncodeToString(hash[:])
}
