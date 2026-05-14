import axios from 'axios';
import { clearAuthSession, getAuthSession } from '@/services/auth-storage';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4001/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const session = getAuthSession();
    const token = session?.token || window.sessionStorage.getItem('token');
   
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const method = error.config?.method?.toUpperCase() ?? 'REQUEST';
      const requestUrl = error.config?.url ?? 'unknown-url';
      const isAuthRequest =
        typeof requestUrl === 'string' &&
        (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/complete-first-login'));
      console.warn(
        `[401] ${method} ${requestUrl}: Unauthorized access, perhaps token is invalid or expired.`,
      );

      if (!isAuthRequest && getAuthSession()?.token) {
        clearAuthSession();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
