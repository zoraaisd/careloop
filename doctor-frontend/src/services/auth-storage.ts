export type DoctorAuthSession = {
  token: string;
  role: 'admin' | 'doctor' | 'patient';
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
};

const AUTH_STORAGE_KEY = 'careloop.auth.session';
const LEGACY_AUTH_STORAGE_KEY = 'meditracker.auth.session';

export const saveAuthSession = (session: DoctorAuthSession): void => {
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem('token', session.token);
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

export const bootstrapAuthSessionFromUrl = (): void => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const role = url.searchParams.get('role');
  const userId = url.searchParams.get('userId');

  if (token && role && userId) {
    saveAuthSession({
      token,
      role: role as DoctorAuthSession['role'],
      userId,
    });

    url.searchParams.delete('token');
    url.searchParams.delete('role');
    url.searchParams.delete('userId');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
};
