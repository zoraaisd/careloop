import type { JwtPayload } from 'jsonwebtoken';

import type {
  DoctorApprovalStatus,
  SubscriptionStatus,
  UserRole,
} from '../../../entities/user.entity';

export type DoctorAccessState =
  | 'full_access'
  | 'pending_review'
  | 'subscription_required'
  | 'rejected';

export interface AuthResponse {
  token: string;
  role: UserRole;
  userId: string;
  name: string;
  email: string;
  phone: string;
  mustChangePassword: boolean;
  approvalStatus: DoctorApprovalStatus;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  accessState: DoctorAccessState;
  canAccessPortal: boolean;
  canAppearPublicly: boolean;
  message: string;
}

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  sessionVersion: number;
}
