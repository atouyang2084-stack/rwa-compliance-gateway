# RWA Compliance Gateway 开发日志

## 2026-06-10：MVP 安全重构完成

### 前端

- 移除公共注册角色选择，所有公共注册固定为 `investor`
- KYC 和资产操作要求连接钱包与登录账户一致
- 使用 `BigInt` 和最小单位整数字符串处理金额
- 移除伪造链上成功的延迟动画和虚假制裁同步
- 合约地址改为环境变量配置
- 更新 ABI 以匹配当前合约

### Go API

- 将所有资产路由纳入 JWT 认证和服务端角色授权
- 操作人从 JWT 推导，不接受客户端发送方身份
- 新增 `uint256` 兼容金额模块
- 新增原子资产账本、Nonce 防重放和余额上限校验
- 新增 SHA-256 前向哈希审计链及完整性验证
- 将辖区状态持久化
- 增加 CORS 和按 IP 限流
- Demo KYC/制裁模式改为显式配置
- 支持真实签名的链上 KYC 哈希锚定
- 未配置 JWT secret 时使用进程级随机 secret，避免固定默认密钥

### Solidity

- 重构 `ComplianceEngine` 的 Admin/Issuer/Regulator 权限边界
- 将白名单、资产和持有人状态绑定到具体 Token
- 限制 holder hooks 仅能由已注册 Token 调用
- 完善 KYC、黑名单、辖区、持仓上限和持有人数量检查
- 重构 `RWAToken` 的 mint、burn、pause、allowance 和转账合规 hook
- 重构 `AssetManager` 的创建、增值、申购、赎回和冻结流程
- 保持资产估值与 Token 供应量同步
- 修复部署脚本并完成本地全流程部署

### 自动化验证

- Go tests：通过
- Go vet：通过
- Hardhat：10 tests passing
- Hardhat 本地部署：通过
- Next.js production build：通过
- 注册页桌面与移动端响应式检查：通过

### 文档

- 重写 README，提供当前架构、配置、启动和 Showcase 流程
- 更新架构全景图和信任边界
- 更新安全审计报告和残余风险
- 更新自动化测试验收矩阵
- 新增 Phase 4 重构蓝图与环境变量模板

## 下一阶段

1. SIWE 钱包签名认证。
2. 正式 KYC/AML/制裁供应商。
3. 受审计的角色管理后台和双人复核。
4. PostgreSQL、Redis 限流、备份和 SIEM。
5. ERC-3643 标准互操作与独立安全审计。
