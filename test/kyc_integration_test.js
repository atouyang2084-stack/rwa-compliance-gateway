// KYC流程端到端集成测试
const axios = require('axios');

// 测试配置
const API_BASE_URL = 'http://localhost:8080/api';

// 测试用户数据
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  dob: '1990-01-01'
};

const testAddress = '0x1234567890123456789012345678901234567890';

// 测试KYC流程
async function testKYCFlow() {
  console.log('开始测试KYC流程...');
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查');
    const healthResponse = await axios.get(`${API_BASE_URL}/v1/health`);
    console.log('健康检查结果:', healthResponse.data);
    
    // 2. 测试KYC验证
    console.log('\n2. 测试KYC验证');
    const kycResponse = await axios.post(`${API_BASE_URL}/v1/compliance/verify`, {
      userAddress: testAddress,
      verificationData: JSON.stringify(testUser)
    });
    
    console.log('KYC验证结果:', kycResponse.data);
    
    if (kycResponse.data.success) {
      console.log('KYC验证成功！');
      console.log('验证ID:', kycResponse.data.verificationId);
      
      // 3. 测试资产审计追踪
      console.log('\n3. 测试资产审计追踪');
      const auditResponse = await axios.get(`${API_BASE_URL}/v1/assets/audit-trail`, {
        params: {
          assetId: 'test-asset-1'
        }
      });
      
      console.log('资产审计追踪结果:', auditResponse.data);
      
      console.log('\n✅ KYC流程测试完成，所有步骤都成功执行！');
    } else {
      console.error('❌ KYC验证失败:', kycResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

// 运行测试
testKYCFlow();
