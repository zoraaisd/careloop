export type AuthRole = 'admin' | 'doctor' | 'patient';

export type AuthSession = {
  token: string;
  role: AuthRole;
  userId: string;
};

const AUTH_STORAGE_KEY = 'meditracker.auth.session';

export const saveAuthSession = (session: AuthSession): void => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const getAuthSession = (): AuthSession | null => {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const clearAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};
