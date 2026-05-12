export type DoctorAuthSession = {
  token: string;
  role: 'admin' | 'doctor' | 'patient';
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  accessState?: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal?: boolean;
  message?: string;
  temporaryPassword?: string;
};

const AUTH_STORAGE_KEY = 'careloop.auth.session';
const LEGACY_AUTH_STORAGE_KEY = 'meditracker.auth.session';
const TOKEN_STORAGE_KEY = 'token';
const AUTH_SESSION_EVENT = 'careloop-auth-session-changed';

const emitAuthSessionChange = (): void => {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
};

const clearLegacyPersistentAuth = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const saveAuthSession = (session: DoctorAuthSession): void => {
  const serialized = JSON.stringify(session);
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.sessionStorage.setItem(LEGACY_AUTH_STORAGE_KEY, serialized);
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  clearLegacyPersistentAuth();
  emitAuthSessionChange();
};

export const getAuthSession = (): DoctorAuthSession | null => {
  clearLegacyPersistentAuth();

  const raw =
    window.sessionStorage.getItem(AUTH_STORAGE_KEY) ??
    window.sessionStorage.getItem(LEGACY_AUTH_STORAGE_KEY);

  if (!raw) {
    const token = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return null;
    }

    return {
      token,
      role: 'doctor',
      userId: '',
    };
  }

  try {
    return JSON.parse(raw) as DoctorAuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
};

export const clearAuthSession = (): void => {
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  clearLegacyPersistentAuth();
  emitAuthSessionChange();
};

export const subscribeToAuthSession = (
  callback: () => void,
): (() => void) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (
      event.key === AUTH_STORAGE_KEY ||
      event.key === LEGACY_AUTH_STORAGE_KEY ||
      event.key === TOKEN_STORAGE_KEY ||
      event.key === null
    ) {
      callback();
    }
  };

  window.addEventListener(AUTH_SESSION_EVENT, callback as EventListener);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT, callback as EventListener);
    window.removeEventListener('storage', handleStorageChange);
  };
};
