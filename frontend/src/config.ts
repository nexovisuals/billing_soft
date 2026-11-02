// Central API configuration
export const API_BASE_URL: string =
  ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:5000';
