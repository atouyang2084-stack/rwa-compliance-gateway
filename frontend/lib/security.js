// 安全工具函数

// XSS防护：HTML转义
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// XSS防护：JavaScript转义
export function escapeJs(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// 输入验证：验证地址格式
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// 输入验证：验证邮箱格式
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 输入验证：验证资产ID格式
export function isValidAssetId(assetId) {
  if (!assetId || typeof assetId !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9-_]{1,64}$/.test(assetId);
}

// 输入验证：验证数字范围
export function isValidNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

// 输入验证：清理输入
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  return input.trim().replace(/[<>]/g, '');
}

// 验证以太坊交易哈希格式
export function isValidTxHash(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

// 验证URL格式
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 格式化地址（隐藏中间部分）
export function formatAddress(address, start = 6, end = 4) {
  if (!address || typeof address !== 'string') {
    return '';
  }
  if (address.length <= start + end) {
    return address;
  }
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
}

// 验证JSON字符串
export function isValidJson(str) {
  if (typeof str !== 'string') {
    return false;
  }
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// 安全地解析JSON
export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// 验证金额格式
export function isValidAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= Number.MAX_SAFE_INTEGER;
}

// 验证日期格式
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// 防止重放攻击：生成随机数
export function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 防止重放攻击：验证时间戳
export function isValidTimestamp(timestamp, maxAge = 300000) {
  const ts = Number(timestamp);
  return !isNaN(ts) && Math.abs(Date.now() - ts) <= maxAge;
}
