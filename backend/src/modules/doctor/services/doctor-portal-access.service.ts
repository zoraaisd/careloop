import { User, DoctorApprovalStatus, SubscriptionStatus, UserRole } from '../../../entities/user.entity';
import type { DoctorPortalAccessSnapshot } from '../types/access.types';

export class DoctorPortalAccessService {
  buildAccessSnapshot(user: User): DoctorPortalAccessSnapshot {
    const trialStartedAt = user.trialStartedAt ? user.trialStartedAt.toISOString() : null;
    const trialEndsAt = user.trialEndsAt ? user.trialEndsAt.toISOString() : null;
    const hasActiveTrial = Boolean(
      user.role === UserRole.DOCTOR &&
      user.trialEndsAt &&
      user.trialEndsAt.getTime() >= Date.now(),
    );

    if (user.role !== UserRole.DOCTOR) {
      return {
        approvalStatus: user.approvalStatus,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt,
        trialEndsAt,
        accessState: 'full_access',
        canAccessPortal: true,
        canAppearPublicly: false,
        hasActiveTrial: false,
        message: 'Access granted.',
      };
    }

    if (user.approvalStatus === DoctorApprovalStatus.REJECTED) {
      return {
        approvalStatus: user.approvalStatus,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt,
        trialEndsAt,
        accessState: 'rejected',
        canAccessPortal: false,
        canAppearPublicly: false,
        hasActiveTrial,
        message: 'Your doctor account has been rejected by admin.',
      };
    }

    if (!hasActiveTrial && user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return {
        approvalStatus: user.approvalStatus,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt,
        trialEndsAt,
        accessState: 'subscription_required',
        canAccessPortal: false,
        canAppearPublicly: user.approvalStatus === DoctorApprovalStatus.APPROVED,
        hasActiveTrial,
        message: 'Trial expired. Please subscribe to continue.',
      };
    }

    if (user.approvalStatus === DoctorApprovalStatus.PENDING) {
      return {
        approvalStatus: user.approvalStatus,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt,
        trialEndsAt,
        accessState: 'pending_review',
        canAccessPortal: true,
        canAppearPublicly: false,
        hasActiveTrial,
        message: 'Your profile is under admin review. You can keep using the portal during your trial.',
      };
    }

    return {
      approvalStatus: user.approvalStatus,
      subscriptionStatus: user.subscriptionStatus,
      trialStartedAt,
      trialEndsAt,
      accessState: 'full_access',
      canAccessPortal: true,
      canAppearPublicly: true,
      hasActiveTrial,
      message: 'Access granted.',
    };
  }
}
