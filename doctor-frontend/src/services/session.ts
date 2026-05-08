export type DoctorSession = {
  token: string;
  role: 'doctor' | 'admin' | 'patient';
  userId: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  accessState?: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal?: boolean;
  message?: string;
};

const SESSION_KEY = 'careloop.doctor.session';

export const getDoctorSession = (): DoctorSession | null => {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DoctorSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const saveDoctorSession = (session: DoctorSession): void => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem('token', session.token);
};

export const clearDoctorSession = (): void => {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem('token');
};
