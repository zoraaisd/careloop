import axios from 'axios';

import { getAuthSession } from '@/services/auth-storage';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const fallbackBaseUrl =
  typeof configuredBaseUrl === 'string' && configuredBaseUrl.includes('localhost:4001')
    ? configuredBaseUrl.replace('localhost:4001', 'localhost:4000')
    : typeof configuredBaseUrl === 'string' && configuredBaseUrl.includes('localhost:4000')
      ? configuredBaseUrl.replace('localhost:4000', 'localhost:4001')
      : null;

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
    if (!axios.isAxiosError(error) || error.response || !error.config || !fallbackBaseUrl) {
      throw error;
    }

    const originalConfig = error.config as typeof error.config & { _didPortFallbackRetry?: boolean };
    if (originalConfig._didPortFallbackRetry) {
      throw error;
    }

    originalConfig._didPortFallbackRetry = true;
    originalConfig.baseURL = fallbackBaseUrl;
    return apiClient.request(originalConfig);
  },
);
