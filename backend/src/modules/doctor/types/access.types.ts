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
  message: string;
};
