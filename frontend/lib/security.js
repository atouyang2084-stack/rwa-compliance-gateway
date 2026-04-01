// Security utility functions

// XSS protection: HTML escape
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

// XSS protection: JavaScript escape
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

// Input validation: Validate address format
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Input validation: Validate email format
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Input validation: Validate asset ID format
export function isValidAssetId(assetId) {
  if (!assetId || typeof assetId !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9-_]{1,64}$/.test(assetId);
}

// Input validation: Validate number range
export function isValidNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Input validation: Sanitize input
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  return input.trim().replace(/[<>]/g, '');
}

// Validate Ethereum transaction hash format
export function isValidTxHash(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

// Validate URL format
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

// Format address (hide middle part)
export function formatAddress(address, start = 6, end = 4) {
  if (!address || typeof address !== 'string') {
    return '';
  }
  if (address.length <= start + end) {
    return address;
  }
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
}

// Validate JSON string
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

// Safely parse JSON
export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// Validate amount format
export function isValidAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= Number.MAX_SAFE_INTEGER;
}

// Validate date format
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// Prevent replay attacks: Generate nonce
export function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Prevent replay attacks: Validate timestamp
export function isValidTimestamp(timestamp, maxAge = 300000) {
  const ts = Number(timestamp);
  return !isNaN(ts) && Math.abs(Date.now() - ts) <= maxAge;
}
