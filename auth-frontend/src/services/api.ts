import axios from 'axios';

import { getAuthSession } from '@/services/auth-storage';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const fallbackBaseUrls = (() => {
  if (typeof configuredBaseUrl !== 'string') {
    return [];
  }

  if (configuredBaseUrl.includes('localhost:4001')) {
    return [configuredBaseUrl.replace('localhost:4001', 'localhost:4000')];
  }

  if (configuredBaseUrl.includes('localhost:4000')) {
    return [configuredBaseUrl.replace('localhost:4000', 'localhost:4001')];
  }

  if (configuredBaseUrl.includes('localhost:5173') || configuredBaseUrl.includes('localhost:5174') || configuredBaseUrl.includes('localhost:5175')) {
    return ['http://localhost:4001/api', 'http://localhost:4000/api'];
  }

  return ['http://localhost:4001/api', 'http://localhost:4000/api'];
})();

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const session = getAuthSession();

  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response || !error.config) {
      throw error;
    }

    const originalConfig = error.config as typeof error.config & { _fallbackAttemptIndex?: number };
    const nextAttemptIndex = originalConfig._fallbackAttemptIndex ?? 0;
    if (nextAttemptIndex >= fallbackBaseUrls.length) {
      throw error;
    }

    originalConfig._fallbackAttemptIndex = nextAttemptIndex + 1;
    originalConfig.baseURL = fallbackBaseUrls[nextAttemptIndex];
    return apiClient.request(originalConfig);
  },
);
