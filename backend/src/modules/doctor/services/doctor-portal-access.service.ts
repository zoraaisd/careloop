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

    const PLAN_CATALOG: Record<string, { name: string; amount: number }> = {
      'plan-free-trial': { name: 'Free Trial',      amount: 0     },
      'plan-starter':    { name: 'Starter Plan',    amount: 1999  },
      'plan-pro':        { name: 'Pro Plan',         amount: 4999  },
      'plan-enterprise': { name: 'Enterprise Plan',  amount: 14999 },
    };

    const subscribedPlan = user.subscribedPlanId ? {
      planId: user.subscribedPlanId,
      planName: PLAN_CATALOG[user.subscribedPlanId]?.name || user.subscribedPlanId,
      amount: PLAN_CATALOG[user.subscribedPlanId]?.amount || 0,
      currency: 'INR'
    } : (hasActiveTrial ? {
      planId: 'plan-free-trial',
      planName: 'Free Trial',
      amount: 0,
      currency: 'INR'
    } : undefined);

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
        subscribedPlan,
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
        subscribedPlan,
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
        subscribedPlan,
      };
    }

    if (!hasActiveTrial && user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return {
        approvalStatus: user.approvalStatus,
        subscriptionStatus: user.subscriptionStatus,
        trialStartedAt,
        trialEndsAt,
        accessState: user.approvalStatus === DoctorApprovalStatus.APPROVED ? 'subscription_required' : 'full_access',
        canAccessPortal: true,
        canAppearPublicly: false,
        hasActiveTrial,
        message:
          user.approvalStatus === DoctorApprovalStatus.APPROVED
            ? 'Your account is approved. Please subscribe to a plan to access your full doctor workspace.'
            : 'Your profile is pending review. Portal access remains active during review.',
        subscribedPlan,
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
      subscribedPlan,
    };
  }
}
