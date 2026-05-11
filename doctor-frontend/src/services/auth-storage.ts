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
};

const AUTH_STORAGE_KEY = 'careloop.auth.session';
const LEGACY_AUTH_STORAGE_KEY = 'meditracker.auth.session';
const AUTH_SESSION_EVENT = 'careloop-auth-session-changed';

const emitAuthSessionChange = (): void => {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
};

export const saveAuthSession = (session: DoctorAuthSession): void => {
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem('token', session.token);
  emitAuthSessionChange();
};

export const getAuthSession = (): DoctorAuthSession | null => {
  const raw =
    window.localStorage.getItem(AUTH_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);

  if (!raw) {
    const token = window.localStorage.getItem('token');
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
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return null;
  }
};

export const clearAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.localStorage.removeItem('token');
  emitAuthSessionChange();
};

export const subscribeToAuthSession = (
  callback: () => void,
): (() => void) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (
      event.key === AUTH_STORAGE_KEY ||
      event.key === LEGACY_AUTH_STORAGE_KEY ||
      event.key === 'token' ||
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
