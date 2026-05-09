import axios from 'axios';

import { clearAuthSession, getAuthSession } from '@/services/auth-storage';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

const fallbackBaseUrls = (() => {
  if (typeof configuredBaseUrl !== 'string') {
    return [];
  }
  // Keep API target explicit from env to avoid hidden cross-port retries.
  return [];
})();

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
  withCredentials: true,
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
    if (axios.isAxiosError(error) && !error.response && error.config) {
      const originalConfig = error.config as typeof error.config & {
        _fallbackAttemptIndex?: number;
      };

      const nextAttemptIndex = originalConfig._fallbackAttemptIndex ?? 0;
      if (nextAttemptIndex < fallbackBaseUrls.length) {
        originalConfig._fallbackAttemptIndex = nextAttemptIndex + 1;
        originalConfig.baseURL = fallbackBaseUrls[nextAttemptIndex];
        return apiClient.request(originalConfig);
      }
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthSession();
    }

    throw error;
  },
);
