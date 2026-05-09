import type {
  DoctorApprovalStatus,
  SubscriptionStatus,
} from '../../../entities/user.entity';

import type { DoctorAccessState } from '../../auth/types/auth.types';

export type DoctorPortalAccessSnapshot = {
  approvalStatus: DoctorApprovalStatus;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  accessState: DoctorAccessState;
  canAccessPortal: boolean;
  canAppearPublicly: boolean;
  hasActiveTrial: boolean;
  clinicId?: string;
  doctorName?: string;
  clinicName?: string | null;
  clinicPhone?: string | null;
  clinicImageUrl?: string | null;
  clinicLogoUrl?: string | null;
  message: string;
  subscribedPlan?: {
    planId: string;
    planName: string;
    amount: number;
    currency: string;
  };
};
