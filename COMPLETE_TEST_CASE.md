# RWA Compliance Gateway 自动化测试与验收矩阵

更新日期：2026-06-12

## 测试目标

验证 MVP 的四类关键不变量：

1. 未认证或错误角色不能执行受限操作。
2. 金额在浏览器、API、数据库和合约之间保持精确。
3. 资产余额、Nonce 和审计事件原子更新。
4. 合规规则不能被未注册 Token 或非授权账户绕过。
5. 只有 Token 绑定的 AssetManager 能改变供应量，且资产估值、内部份额和
   `totalSupply` 始终一致。

## 自动化测试

### Go API 与账本

运行：

```bash
cd backend
GOCACHE=/tmp/rwa-go-cache go test ./...
GOCACHE=/tmp/rwa-go-cache go vet ./...
```

覆盖场景：

| 场景 | 预期 |
|---|---|
| 公共注册提交 `admin` role | 实际创建 `investor` |
| Investor 访问 Issuer API | 403 |
| 请求体伪造 `fromAddress` | 忽略，使用 JWT 操作人 |
| 重复 Nonce | 409，余额不重复变化 |
| `1.25` 作为最小单位 | 400 |
| 大于 `uint256` | 400 |
| 余额不足 | 整个事务回滚 |
| 超过资产总供应量申购 | 拒绝 |
| 转账给未 KYC/制裁地址 | 403 |
| 修改历史审计记录 | `integrityVerified=false` |
| 冻结/解冻/下架错误角色 | 403 |

### Solidity

运行：

```bash
npm test
```

当前 16 个测试覆盖：

| 套件 | 场景 |
|---|---|
| AssetManager | 创建 2 位小数锚定资产 |
| AssetManager | 合规转账与精确赎回 |
| AssetManager | 增加估值时同步供应量 |
| AssetManager | 受控估值升降保持三账锚定 |
| AssetManager | 非授权发行和冻结拦截 |
| AssetManager | 全局 Issuer 直接 mint/burnFrom 拦截 |
| AssetManager | 估值、内部份额与 Token 供应量不变量 |
| ComplianceEngine | 未授权 KYC/角色/holder 写入 |
| ComplianceEngine | Token 绑定与持有人跟踪 |
| ComplianceEngine | 黑名单和持仓上限 |
| ComplianceEngine | 跨资产估值与白名单写入拦截 |
| ComplianceEngine | 非 Token 控制器注册资产拦截 |
| RWAToken | 最小单位无浮点计算 |
| RWAToken | 唯一供应控制器 mint/burnFrom |
| RWAToken | 公开 burn 移除和未 KYC 转账 |
| RWAToken | Pause 和 Allowance 边界 |

### 前端

运行：

```bash
cd frontend
npm run build
```

验收点：

- Next.js 编译、Lint 和类型检查通过
- 注册页面不提供角色选择
- 资产金额通过 `decimalToUnits` 转换
- 钱包账户与登录账户不一致时阻止 KYC/资产操作
- 合约地址来自 `NEXT_PUBLIC_*` 环境变量
- 桌面和 390 x 844 移动端无横向溢出

### 部署脚本

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

验收点：

1. 部署 `ComplianceEngine`。
2. 部署 `OracleManager`。
3. 部署并连接 `AssetManager`。
4. 为 AssetManager 配置必要角色。
5. 为部署账户配置 Demo KYC 和辖区。
6. 创建 Demo RWA，并输出 `RWAToken` 地址。

## 手工 Showcase 验收

| 步骤 | 操作 | 通过标准 |
|---|---|---|
| 1 | 注册投资者 | 返回 role=investor |
| 2 | 登录 | 返回 JWT 和绑定地址 |
| 3 | 连接不同钱包 | KYC/资产操作被阻止 |
| 4 | 连接相同钱包并 KYC | 状态变为 verified |
| 5 | Issuer 创建资产 | value units = token units |
| 6 | 合规用户申购 | 余额精确增加 |
| 7 | 转账给未 KYC 地址 | 被拒绝 |
| 8 | 转账给合规地址 | 两侧余额原子变化 |
| 9 | 重放相同 Nonce | 被拒绝且余额不变 |
| 10 | Regulator 冻结资产 | 后续受限操作被拒绝 |
| 11 | 查询审计链 | `integrityVerified=true` |

## 2026-06-12 执行结果

| 检查 | 结果 |
|---|---|
| Go tests | Passed |
| Go vet | Passed |
| Hardhat tests | 16 passed |
| Hardhat deployment | Passed |
| Next.js production build | Passed |
| Desktop responsive check | Passed |
| 390 x 844 responsive check | Passed |

## 不在当前测试保证内

- 公网 RPC 稳定性和链重组处理
- 外部 KYC Webhook 签名与供应商 SLA
- 多实例分布式限流
- 长时间压力、容量和故障恢复
- 主网 Gas 成本和 MEV 场景
- 完整 ERC-3643/T-REX 兼容认证
- 第三方渗透测试和独立合约审计
