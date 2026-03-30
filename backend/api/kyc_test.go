package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"rwaGateway/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// 测试KYC状态查询
func TestGetKYCStatus(t *testing.T) {
	// 初始化数据库
	database.InitDatabase("./test.db")
	defer database.Close()

	// 创建测试用户
	userAddress := "0x1111111111111111111111111111111111111111"
	
	// 模拟用户已完成KYC验证
	err := database.UpdateKYCVerified(userAddress, true)
	assert.NoError(t, err)

	// 设置路由
	r := gin.Default()
	r.GET("/v1/compliance/status", GetKYCStatus)

	// 构造请求
	req, _ := http.NewRequest("GET", "/v1/compliance/status?address="+userAddress, nil)
	req.Header.Set("Authorization", "Bearer test-token")

	// 记录响应
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// 验证响应
	assert.Equal(t, http.StatusOK, w.Code)

	// 解析响应
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// 验证KYC状态为已验证
	assert.True(t, response["verified"].(bool), "KYC状态应该为已验证")
	assert.Equal(t, userAddress, response["address"].(string))

	t.Log("测试通过：KYC状态查询正常")
}

// 测试未完成KYC验证的用户
func TestGetKYCStatus_NotVerified(t *testing.T) {
	// 初始化数据库
	database.InitDatabase("./test.db")
	defer database.Close()

	// 创建测试用户（未完成KYC）
	userAddress := "0x2222222222222222222222222222222222222222"
	
	// 确保用户未完成KYC验证
	err := database.UpdateKYCVerified(userAddress, false)
	assert.NoError(t, err)

	// 设置路由
	r := gin.Default()
	r.GET("/v1/compliance/status", GetKYCStatus)

	// 构造请求
	req, _ := http.NewRequest("GET", "/v1/compliance/status?address="+userAddress, nil)
	req.Header.Set("Authorization", "Bearer test-token")

	// 记录响应
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// 验证响应
	assert.Equal(t, http.StatusOK, w.Code)

	// 解析响应
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// 验证KYC状态为未验证
	assert.False(t, response["verified"].(bool), "KYC状态应该为未验证")
	assert.Equal(t, userAddress, response["address"].(string))

	t.Log("测试通过：未验证用户的KYC状态查询正常")
}

// 测试测试模式下的KYC验证（所有用户都通过）
func TestGetKYCStatus_TestMode(t *testing.T) {
	// 初始化数据库
	database.InitDatabase("./test.db")
	defer database.Close()

	// 测试模式下，即使数据库中没有记录，也应该返回已验证
	userAddress := "0x3333333333333333333333333333333333333333"

	// 设置路由
	r := gin.Default()
	r.GET("/v1/compliance/status", GetKYCStatus)

	// 构造请求
	req, _ := http.NewRequest("GET", "/v1/compliance/status?address="+userAddress, nil)
	req.Header.Set("Authorization", "Bearer test-token")

	// 记录响应
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// 验证响应
	assert.Equal(t, http.StatusOK, w.Code)

	// 解析响应
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// 测试模式下应该返回已验证
	assert.True(t, response["verified"].(bool), "测试模式下所有用户都应该通过KYC验证")
	assert.Equal(t, userAddress, response["address"].(string))

	t.Log("测试通过：测试模式下KYC验证正常")
}