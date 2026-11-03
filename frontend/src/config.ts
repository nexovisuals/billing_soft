// Central API configuration
const rawUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
export const API_BASE_URL: string = rawUrl
  ? rawUrl.replace(/\/+$/, '')
  : (import.meta as any).env?.MODE === 'production'
  ? ''
  : 'http://localhost:5000';

