import { useEffect } from 'react';

import { clearAuthSession, getAuthSession, saveAuthSession } from '@/services/auth-storage';

type AuthGuardProps = {
  children: React.ReactNode;
};

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

const AuthGuard = ({ children }: AuthGuardProps) => {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');

    if (token && role === 'admin' && userId) {
      saveAuthSession({ token, role: 'admin', userId });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = getAuthSession();

      if (!session || session.role !== 'admin') {
        clearAuthSession();
        window.location.assign(`${AUTH_APP_URL}/login`);
      }
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const session = getAuthSession();

  if (!session || session.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};

export { AuthGuard };
