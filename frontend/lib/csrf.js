// CSRF保护工具

// 生成CSRF令牌
export function generateCsrfToken() {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 存储CSRF令牌
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

// 获取请求头中的CSRF令牌
export function getCsrfHeader() {
  return {
    'X-CSRF-Token': csrfToken || ''
  };
}

// 验证CSRF令牌（简单实现）
export function verifyCsrfToken(token) {
  if (!token || !csrfToken) {
    return false;
  }
  return token === csrfToken;
}

// 在页面加载时生成令牌
if (typeof window !== 'undefined') {
  setCsrfToken(generateCsrfToken());
}
