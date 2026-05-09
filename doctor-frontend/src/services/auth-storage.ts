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
  const approvalStatus = url.searchParams.get('approvalStatus');
  const accessState = url.searchParams.get('accessState');
  const canAccessPortal = url.searchParams.get('canAccessPortal');
  const message = url.searchParams.get('message');

  if (token && role && userId) {
    saveAuthSession({
      token,
      role: role as DoctorAuthSession['role'],
      userId,
      approvalStatus: approvalStatus as DoctorAuthSession['approvalStatus'] | null ?? undefined,
      accessState: accessState as DoctorAuthSession['accessState'] | null ?? undefined,
      canAccessPortal:
        canAccessPortal === null ? undefined : canAccessPortal === 'true',
      message: message ?? undefined,
    });

    url.searchParams.delete('token');
    url.searchParams.delete('role');
    url.searchParams.delete('userId');
    url.searchParams.delete('approvalStatus');
    url.searchParams.delete('accessState');
    url.searchParams.delete('canAccessPortal');
    url.searchParams.delete('message');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
};

export const clearAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.localStorage.removeItem('token');
};
