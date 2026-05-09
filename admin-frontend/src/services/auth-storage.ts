export type AuthRole = 'admin' | 'doctor' | 'patient';

export type AuthSession = {
  token: string;
  role: AuthRole;
  userId: string;
};

const AUTH_STORAGE_KEY = 'careloop.admin.session';
const LEGACY_AUTH_STORAGE_KEY = 'meditracker.admin.session';

export const saveAuthSession = (session: AuthSession): void => {
  const serialized = JSON.stringify(session);
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.sessionStorage.setItem(LEGACY_AUTH_STORAGE_KEY, serialized);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
};

export const getAuthSession = (): AuthSession | null => {
  const raw =
    window.sessionStorage.getItem(AUTH_STORAGE_KEY) ??
    window.sessionStorage.getItem(LEGACY_AUTH_STORAGE_KEY);

  // Clear any older persistent admin sessions so opening the admin app requires a fresh login.
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return null;
  }
};

export const bootstrapAuthSessionFromUrl = (): void => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const role = url.searchParams.get('role');
  const userId = url.searchParams.get('userId');

  if (token && role === 'admin' && userId) {
    saveAuthSession({
      token,
      role: 'admin',
      userId,
    });

    url.searchParams.delete('token');
    url.searchParams.delete('role');
    url.searchParams.delete('userId');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
};

export const clearAuthSession = (): void => {
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
};
