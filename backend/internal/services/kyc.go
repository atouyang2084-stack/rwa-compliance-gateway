package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
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
		apiKey:     os.Getenv("ONFIDO_API_KEY"),
		apiBaseURL: "https://api.onfido.com/v3.6",
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
		"type": "standard",
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

	// 创建申请人
	applicant, err := api.CreateApplicant(
		data["firstName"],
		data["lastName"],
		data["email"],
		data["dob"],
	)
	if err != nil {
		return false, "", err
	}

	// 创建检查
	check, err := api.CreateCheck(applicant.ID)
	if err != nil {
		return false, "", err
	}

	// 模拟等待检查完成（实际项目中应该通过webhook处理）
	time.Sleep(2 * time.Second)

	// 获取检查结果
	updatedCheck, err := api.GetCheck(check.ID)
	if err != nil {
		return false, "", err
	}

	// 检查结果
	if updatedCheck.Status == "completed" && updatedCheck.Result != nil && updatedCheck.Result.Status == "clear" {
		return true, check.ID, nil
	}

	return false, "", fmt.Errorf("KYC verification failed: %s", updatedCheck.Status)
}
