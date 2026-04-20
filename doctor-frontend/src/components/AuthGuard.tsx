import { useEffect } from 'react';
import { getAuthSession, saveAuthSession } from '@/services/auth-storage';

type AuthGuardProps = {
  children: React.ReactNode;
};

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:5173';

export const AuthGuard = ({ children }: AuthGuardProps) => {
  useEffect(() => {
    // Check for tokens in the URL passed from Auth App
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');

    if (token && role === 'doctor' && userId) {
      saveAuthSession({ token, role: role as 'doctor', userId });
      // Remove tokens from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const session = getAuthSession();

  useEffect(() => {
    // Run this check after a slight delay to allow the first useEffect to process the URL params
    const timeoutId = setTimeout(() => {
      const currentSession = getAuthSession();
      if (!currentSession || currentSession.role !== 'doctor') {
        window.location.assign(`${AUTH_APP_URL}/login`);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [session]);

  // If there's no session initially, we might be processing the URL params.
  // Wait for the timeout above to handle redirection.
  if (!session || session.role !== 'doctor') {
    return null;
  }

  return <>{children}</>;
};
