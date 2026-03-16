# RWA Compliance Gateway

## 项目概述

RWA Compliance Gateway是一个连接链下现实世界资产(RWA)与链上DeFi生态的合规准入网关。它解决了机构资产上链时的身份校验(KYC)、洗钱防范(AML)以及跨司法管辖区的合规自动执行问题。

### 核心价值
- **合规验证**：集成第三方KYC服务，为用户生成链上可验证凭证
- **风险控制**：实时同步制裁名单，自动拦截风险地址
- **权限管理**：基于角色的访问控制，区分资产发行方、投资者、托管方和监管者
- **资产代币化**：支持ERC-3643或ERC-1400标准，实现资产价值与链上代币的1:1锚定
- **合规规则**：可编程限制，包括持有者数量上限、单一账户最大持仓限制、转账白名单强制校验

## 技术架构

### 层级结构

| 层级 | 技术栈 | 职责描述 |
|------|--------|----------|
| 应用层(Frontend) | Next.js | 提供机构端后台与投资者Dashboard（暂时移除了RainbowKit依赖） |
| 接入层(Gateway) | Go | 处理API请求、签名转发、交易预检查 |
| 合规层(Middleware) | 自定义服务 | 链下合规数据证明转换，保护用户隐私 |
| 合约层(Blockchain) | Solidity (Ethereum/Polygon) | 核心业务逻辑、权限控制、资产发行 |
| 数据层(Storage) | SQLite (开发环境) | 资产数据持久化存储 |
| 数据层(Indexing) | 自定义服务 | 检索链上资产流转记录及合规日志 |

## 项目结构

```
rwaGateway/
├── backend/               # Go后端项目
│   ├── api/              # API路由和处理器
│   ├── config/           # 配置管理
│   ├── internal/         # 内部服务和中间件
│   │   ├── database/     # 数据库操作
│   │   ├── handlers/     # 请求处理器
│   │   ├── middleware/   # 中间件
│   │   └── services/     # 业务服务
│   ├── pkg/              # 公共包
│   │   └── utils/        # 工具函数
│   ├── main.go           # 后端入口文件
│   ├── go.mod            # Go模块配置
│   └── rwa_gateway.db    # SQLite数据库文件
├── frontend/              # Next.js前端项目
│   ├── app/              # App Router页面
│   ├── components/       # 组件
│   ├── lib/              # 工具库
│   ├── pages/            # 页面
│   ├── public/           # 静态资源
│   ├── package.json      # 前端依赖配置
│   └── next.config.js    # Next.js配置
├── contracts/             # 智能合约
│   ├── ComplianceRegistry.sol  # 合规注册表接口
│   ├── ComplianceEngine.sol    # 合规引擎实现
│   ├── OracleManager.sol       # 预言机管理器
│   ├── AssetManager.sol        # 资产管理
│   └── RWAToken.sol            # ERC-3643代币合约
├── .env.example          # 环境变量示例
├── .gitignore            # Git忽略文件
└── README.md             # 项目文档
```

## 核心功能模块

### 1. 身份与权限管理 (DID & Role-based Access Control)
- **合规验证**：集成第三方KYC服务，为用户生成链上可验证凭证(VC)
- **黑名单机制**：实时同步制裁名单（如OFAC），自动拦截风险地址
- **角色定义**：区分资产发行方(Issuer)、投资者(Investor)、托管方(Custodian)和监管者(Regulator)

### 2. 资产代币化引擎 (Tokenization Engine)
- **标准支持**：支持ERC-3643（带有合规功能的代币标准）或ERC-1400
- **资产挂钩**：实现现实资产价值与链上代币的1:1锚定逻辑及预言机(Oracle)喂价

### 3. 合规规则引擎 (Compliance Rule Engine)
- **可编程限制**：
  - 持有者数量上限限制
  - 单一账户最大持仓限制
  - 转账白名单强制校验

## 核心交互流程

### 资产上链流程
1. 资产发行方提交线下证明
2. 网关审核
3. 触发合约mint()
4. 代币发送至合规托管地址

### 交易拦截流程
1. 用户A发起转账
2. 合约调用isVerify()
3. 校验A与B是否均在白名单且未超过限额
4. 执行/拒绝

## 智能合约

### ComplianceRegistry.sol
核心合规合约接口，包含以下功能：
- KYC验证相关函数
- 黑名单管理
- 角色管理
- 资产管理
- 合规规则检查

详细接口定义请参考 `contracts/ComplianceRegistry.sol` 文件。

### ComplianceEngine.sol
合规引擎实现，实现了ComplianceRegistry接口的所有功能，包括：
- KYC验证和管理
- 黑名单管理
- 基于角色的访问控制
- 资产管理和状态更新
- 白名单管理
- 合规规则检查

### OracleManager.sol
预言机管理器，用于管理资产价格：
- 设置和获取资产价格
- 计算资产价值
- 检查价格是否过期

### AssetManager.sol
资产管理合约，实现了资产的创建、存款、赎回等功能：
- 创建新资产
- 存款（增加资产价值并铸造代币）
- 赎回（销毁代币并释放资产价值）
- 更新资产价值
- 暂停和恢复资产

### RWAToken.sol
ERC-3643合规代币合约，支持：
- 基于角色的访问控制
- 合规检查
- 代币铸造和销毁
- 转账限制

## API接口

### 核心API端点

| 方法 | 路径 | 功能描述 |
|------|------|----------|
| POST | /v1/compliance/verify | 提交KYC资料并返回链上证明 |
| GET | /v1/assets/audit-trail | 获取指定资产的完整合规审计追踪 |
| GET | /v1/assets/list | 获取所有资产列表 |
| GET | /v1/assets/details | 获取指定资产详情 |
| POST | /v1/assets/create | 创建新资产 |
| POST | /v1/assets/deposit | 存款（增加资产价值并铸造代币） |
| POST | /v1/assets/redeem | 赎回（销毁代币并释放资产价值） |
| POST | /v1/assets/transfer | 转账（在用户之间转移代币） |
| POST | /v1/assets/freeze | 冻结资产 |
| POST | /v1/assets/unfreeze | 解冻资产 |
| GET | /v1/health | 健康检查 |

### 请求与响应示例

#### POST /v1/compliance/verify

**请求体**：
```json
{
  "userAddress": "0x1234567890123456789012345678901234567890",
  "verificationData": "{\"name\": \"John Doe\", \"id\": \"123456789\"}"
}
```

**响应**：
```json
{
  "success": true,
  "verificationId": "KYC-123456",
  "userId": "0x1234567890123456789012345678901234567890",
  "message": "KYC verification successful"
}
```

#### GET /v1/assets/audit-trail

**查询参数**：
- assetId: 资产ID

**响应**：
```json
{
  "assetId": "asset-123",
  "auditTrail": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "action": "Asset Created",
      "actor": "0x1234567890123456789012345678901234567890",
      "details": "Initial asset creation"
    },
    {
      "timestamp": "2024-01-02T10:00:00Z",
      "action": "KYC Verified",
      "actor": "0x0987654321098765432109876543210987654321",
      "details": "User KYC verification completed"
    }
  ]
}
```

#### GET /v1/assets/list

**响应**：
```json
{
  "success": true,
  "assets": [
    {
      "assetId": "test-asset-1",
      "name": "Test Asset 1",
      "symbol": "TA1",
      "totalValue": 100000,
      "totalTokens": 100000,
      "tokenAddress": "0x8221201A5c1c62bDfB0431beAD8843931f2A72aE",
      "isActive": true
    }
  ]
}
```

#### GET /v1/assets/details

**查询参数**：
- assetId: 资产ID

**响应**：
```json
{
  "success": true,
  "asset": {
    "assetId": "test-asset-1",
    "name": "Test Asset 1",
    "symbol": "TA1",
    "totalValue": 100000,
    "totalTokens": 100000,
    "tokenAddress": "0x8221201A5c1c62bDfB0431beAD8843931f2A72aE",
    "isActive": true
  }
}
```

#### POST /v1/assets/create

**请求体**：
```json
{
  "assetId": "test-asset-1",
  "name": "Test Asset 1",
  "symbol": "TA1",
  "initialValue": 100000,
  "complianceRegistry": "0x1234567890123456789012345678901234567890"
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "name": "Test Asset 1",
  "symbol": "TA1",
  "initialValue": 100000,
  "message": "Asset created successfully"
}
```

#### POST /v1/assets/deposit

**请求体**：
```json
{
  "assetId": "test-asset-1",
  "value": 25000
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "value": 25000,
  "message": "Deposit successful"
}
```

#### POST /v1/assets/redeem

**请求体**：
```json
{
  "assetId": "test-asset-1",
  "tokens": 10000
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "tokens": 10000,
  "message": "Redeem successful"
}
```

#### POST /v1/assets/transfer

**请求体**：
```json
{
  "assetId": "test-asset-1",
  "fromAddress": "0x1234567890123456789012345678901234567890",
  "toAddress": "0x0987654321098765432109876543210987654321",
  "amount": 1000
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "from": "0x1234567890123456789012345678901234567890",
  "to": "0x0987654321098765432109876543210987654321",
  "amount": 1000,
  "message": "Transfer successful"
}
```

#### POST /v1/assets/freeze

**请求体**：
```json
{
  "assetId": "test-asset-1"
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "message": "Asset frozen successfully"
}
```

#### POST /v1/assets/unfreeze

**请求体**：
```json
{
  "assetId": "test-asset-1"
}
```

**响应**：
```json
{
  "success": true,
  "assetId": "test-asset-1",
  "message": "Asset unfrozen successfully"
}
```

## 安装与运行

### 后端安装

1. 进入后端目录：
   ```bash
   cd backend
   ```

2. 安装依赖：
   ```bash
   go mod download
   ```

3. 复制环境变量文件并配置：
   ```bash
   cp ../.env.example .env
   # 编辑.env文件，填写相关配置
   ```

4. 运行后端服务：
   ```bash
   go run main.go
   ```

### 前端安装

1. 进入前端目录：
   ```bash
   cd frontend
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 复制环境变量文件并配置：
   ```bash
   cp ../.env.example .env.local
   # 编辑.env.local文件，填写相关配置
   ```

4. 运行前端开发服务器：
   ```bash
   npm run dev
   ```

### 前端改进

- **商业网站风格**：采用成熟的商业网站设计，页面布局清晰，按钮明显，使用顺畅
- **基于角色的访问控制**：根据用户角色（投资者、发行方、托管方、监管者）显示不同的界面和操作
- **钱包连接要求**：在执行任何操作前，用户必须先连接钱包
- **API代理配置**：使用Next.js的API代理功能，避免CORS问题
- **用户体验优化**：未连接钱包时显示友好的提示信息，而不是网络错误

## 配置说明

环境变量配置文件 `.env.example` 包含以下主要配置项：

- **后端服务配置**：端口、环境等
- **区块链配置**：RPC URL、链ID等
- **智能合约地址**：合规注册表合约地址
- **KYC服务配置**：API密钥、端点等
- **黑名单服务配置**：OFAC API密钥等
- **身份验证配置**：JWT密钥等
- **安全配置**：HSM密钥ID、MPC配置等
- **断路器配置**：启用状态、阈值等
- **预言机配置**：API密钥、端点等

## 安全性要求

- **密钥管理**：机构私钥需托管于物理HSM或使用MPC(多方计算)签名
- **多重签名**：涉及资产敏感操作（如冻结、增发）必须经过m/n多签
- **断路器机制**：当合规服务宕机时，网关应能自动暂停高风险交易

## 开发指南

### 代码规范
- **Go代码**：遵循Go语言标准规范
- **前端代码**：遵循Next.js和React最佳实践
- **智能合约**：遵循Solidity最佳实践和安全规范

### 测试
- 后端API测试：使用Go测试框架
- 前端测试：使用Jest和React Testing Library
- 智能合约测试：使用Hardhat或Truffle
- 系统集成测试：使用Node.js测试脚本

### 系统集成测试

#### 运行系统集成测试
1. 进入测试目录：
   ```bash
   cd test
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动后端服务：
   ```bash
   cd ../backend && go run main.go
   ```

4. 运行测试脚本：
   ```bash
   cd ../test && node system_integration_test.js
   ```

#### 测试内容
- 健康检查API
- KYC验证流程
- 资产创建、存款、赎回功能
- 资产列表和详情查询
- 资产审计追踪API
- 前端服务状态

## 系统要求

- **后端**：Go 1.26.1+
- **前端**：Node.js 18.0+
- **智能合约**：Solidity 0.8.20+
- **测试**：Node.js 18.0+

### 部署
- 后端：容器化部署，支持Kubernetes
- 前端：静态部署到CDN
- 智能合约：多链部署，支持Ethereum和Polygon

## 后续计划

1. **功能实现**：
   - ✅ 完成KYC服务集成
   - ✅ 实现资产代币化逻辑
   - ✅ 开发合规规则引擎

2. **安全审计**：
   - ✅ 智能合约安全审计
   - ✅ API安全测试
   - ✅ 渗透测试

3. **性能优化**：
   - API响应速度优化
   - 合约Gas费用优化
   - 前端加载速度优化

4. **扩展功能**：
   - 支持更多区块链网络
   - 集成更多KYC服务提供商
   - 开发移动端应用

5. **生态建设**：
   - 建立开发者文档
   - 开发SDK和API客户端
   - 构建合作伙伴生态

## 贡献指南

欢迎社区贡献！请按照以下步骤：

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 联系方式

- 项目维护者：[Wong壁虎]
- 邮箱：[atouyang@163.com]
- 仓库地址：[https://github.com/atouyang2084-stack/rwa-compliance-gateway]

---

**注意**：本文档将随着项目的进展不断更新，敬请关注。
