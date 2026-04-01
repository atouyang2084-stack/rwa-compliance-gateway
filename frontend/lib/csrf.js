// CSRF protection utilities

// Generate CSRF token
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

// Store CSRF token
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

// Get CSRF token for request headers
export function getCsrfHeader() {
  return {
    'X-CSRF-Token': csrfToken || ''
  };
}

// Verify CSRF token (simple implementation)
export function verifyCsrfToken(token) {
  if (!token || !csrfToken) {
    return false;
  }
  return token === csrfToken;
}

// Generate token on page load
if (typeof window !== 'undefined') {
  setCsrfToken(generateCsrfToken());
}
