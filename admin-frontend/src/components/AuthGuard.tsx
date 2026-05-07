import { useEffect } from 'react';

import { clearAuthSession, getAuthSession } from '@/services/auth-storage';

type AuthGuardProps = {
  children: React.ReactNode;
};

const AuthGuard = ({ children }: AuthGuardProps) => {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = getAuthSession();

      if (!session || session.role !== 'admin') {
        clearAuthSession();
        window.location.assign('/admin/login');
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
