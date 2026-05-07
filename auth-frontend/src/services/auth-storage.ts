export type AuthRole = 'admin' | 'doctor' | 'patient';

export type AuthSession = {
  token: string;
  role: AuthRole;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
};

const AUTH_STORAGE_KEY = 'careloop.auth.session';
const LEGACY_AUTH_STORAGE_KEY = 'meditracker.auth.session';

export const saveAuthSession = (session: AuthSession): void => {
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, serialized);
};

export const getAuthSession = (): AuthSession | null => {
  const raw =
    window.localStorage.getItem(AUTH_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return null;
  }
};

export const clearAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
};
