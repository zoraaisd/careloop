import api from '@/services/api';

export type DoctorAccessState = {
  approvalStatus: string;
  subscriptionStatus: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  accessState: string;
  canAccessPortal: boolean;
  canAppearPublicly: boolean;
  hasActiveTrial: boolean;
  clinicId?: string;
  doctorName?: string;
  clinicName?: string | null;
  clinicPhone?: string | null;
  clinicLogoUrl?: string | null;
  clinicImageUrl?: string | null;
  message: string;
};

export async function getDoctorAccessState() {
  const { data } = await api.get('/doctor/access-state');
  return data as DoctorAccessState;
}
