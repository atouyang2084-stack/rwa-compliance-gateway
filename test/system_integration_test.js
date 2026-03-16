// 系统集成测试脚本
// 测试前端与后端的集成、后端与智能合约的集成、整个流程的端到端功能

const axios = require('axios');

// 测试配置
const API_BASE_URL = 'http://localhost:8081';
const FRONTEND_URL = 'http://localhost:3001';

// 测试用户数据
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  dob: '1990-01-01'
};

const testAddress = '0x1234567890123456789012345678901234567890';

// 测试资产数据
const testAsset = {
  assetId: 'test-asset-integration',
  name: 'Integration Test Asset',
  symbol: 'ITA',
  initialValue: 100000,
  complianceRegistry: '0x1234567890123456789012345678901234567890'
};

// 测试健康检查
async function testHealthCheck() {
  console.log('1. 测试健康检查');
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/health`);
    console.log('✅ 健康检查成功:', response.data);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    return false;
  }
}

// 测试KYC验证
async function testKYCVerification() {
  console.log('\n2. 测试KYC验证');
  try {
    const response = await axios.post(`${API_BASE_URL}/v1/compliance/verify`, {
      userAddress: testAddress,
      verificationData: JSON.stringify(testUser)
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ KYC验证成功:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ KYC验证失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
    return false;
  }
}

// 测试资产创建
async function testAssetCreation() {
  console.log('\n3. 测试资产创建');
  try {
    const response = await axios.post(`${API_BASE_URL}/v1/assets/create`, testAsset, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产创建成功:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ 资产创建失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
    return false;
  }
}

// 测试资产列表
async function testAssetList() {
  console.log('\n4. 测试资产列表');
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/assets/list`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产列表获取成功:', response.data.assets.length, '个资产');
    return response.data.success;
  } catch (error) {
    console.error('❌ 资产列表获取失败:', error.message);
    return false;
  }
}

// 测试资产详情
async function testAssetDetails() {
  console.log('\n5. 测试资产详情');
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/assets/details`, {
      params: {
        assetId: testAsset.assetId
      },
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产详情获取成功:', response.data.asset);
    return response.data.success;
  } catch (error) {
    console.error('❌ 资产详情获取失败:', error.message);
    return false;
  }
}

// 测试资产存款
async function testAssetDeposit() {
  console.log('\n6. 测试资产存款');
  try {
    const response = await axios.post(`${API_BASE_URL}/v1/assets/deposit`, {
      assetId: testAsset.assetId,
      value: 50000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产存款成功:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ 资产存款失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
    return false;
  }
}

// 测试资产赎回
async function testAssetRedeem() {
  console.log('\n7. 测试资产赎回');
  try {
    const response = await axios.post(`${API_BASE_URL}/v1/assets/redeem`, {
      assetId: testAsset.assetId,
      tokens: 25000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产赎回成功:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ 资产赎回失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
    return false;
  }
}

// 测试资产审计追踪
async function testAssetAuditTrail() {
  console.log('\n8. 测试资产审计追踪');
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/assets/audit-trail`, {
      params: {
        assetId: testAsset.assetId
      },
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ 资产审计追踪获取成功:', response.data.auditTrail.length, '条记录');
    return response.data.assetId === testAsset.assetId;
  } catch (error) {
    console.error('❌ 资产审计追踪获取失败:', error.message);
    return false;
  }
}

// 测试前端服务
async function testFrontendService() {
  console.log('\n9. 测试前端服务');
  try {
    const response = await axios.get(FRONTEND_URL, {
      timeout: 10000
    });
    console.log('✅ 前端服务正常:', response.status);
    return response.status === 200;
  } catch (error) {
    console.error('❌ 前端服务失败:', error.message);
    return false;
  }
}

// 运行完整的系统集成测试
async function runSystemIntegrationTests() {
  console.log('🚀 开始系统集成测试...');
  console.log('=' .repeat(60));
  
  const tests = [
    testHealthCheck,
    testKYCVerification,
    testAssetCreation,
    testAssetList,
    testAssetDetails,
    testAssetDeposit,
    testAssetRedeem,
    testAssetAuditTrail,
    testFrontendService
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passedTests++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`测试完成: ${passedTests}/${tests.length} 个测试通过`);
  
  if (passedTests === tests.length) {
    console.log('🎉 所有测试都通过了！系统集成测试成功！');
    return true;
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查和修复');
    return false;
  }
}

// 运行测试
runSystemIntegrationTests();
