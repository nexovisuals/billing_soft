// Central API configuration
let rawUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim();

if (rawUrl) {
  // Strip trailing slashes
  rawUrl = rawUrl.replace(/\/+$/, '');
  // Auto-correct accidental paste typos (e.g. Ctrl+V adding a trailing 'v' like .comv -> .com)
  if (rawUrl.endsWith('.comv')) {
    rawUrl = rawUrl.slice(0, -1);
  }
}

export const API_BASE_URL: string = rawUrl
  ? rawUrl
  : (import.meta as any).env?.MODE === 'production'
  ? 'https://billing-backend-gyta.onrender.com'
  : 'http://localhost:5000';



