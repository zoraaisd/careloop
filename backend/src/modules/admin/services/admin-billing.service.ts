import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { SubscriptionStatus, UserRole } from '../../../entities/user.entity';
import { adminStoreService } from './admin-store.service';
import type {
  AdminBillingResponse,
  BillingOverview,
  ClinicSubscriptionPayment,
  ClinicSubscriptionRecord,
  SubscriptionPlan,
} from '../types/admin.types';

class AdminBillingService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);

  async getOverview(): Promise<BillingOverview> {
    const plans = adminStoreService.getPlans();
    const payments = await this.getPayments();
    const subscriptions = await this.getClinicSubscriptions();

    return {
      totalPlans: plans.length,
      activeSubscriptions: subscriptions.filter((item) => item.status === 'Active').length,
      monthlyRevenue: `Rs ${payments
        .filter((item) => item.status === 'Paid')
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString('en-IN')}`,
      expiredSubscriptions: subscriptions.filter((item) => item.status === 'Expired').length,
    };
  }

  async getBillingData(): Promise<AdminBillingResponse> {
    return {
      overview: await this.getOverview(),
      plans: adminStoreService.getPlans(),
    };
  }

  getPlans(): SubscriptionPlan[] {
    return adminStoreService.getPlans();
  }

  private getPlanById(planId: string | null | undefined): SubscriptionPlan | undefined {
    return adminStoreService.getPlans().find((plan) => plan.id === planId);
  }

  async getClinicSubscriptions(): Promise<ClinicSubscriptionRecord[]> {
    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    // Fetch real data from DB
    const profiles = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    const dbSubscriptions: ClinicSubscriptionRecord[] = profiles.map((profile) => {
      const planId = profile.user.subscribedPlanId ?? 'plan-starter';
      const plan = this.getPlanById(planId);
      const startDate = profile.user.trialStartedAt ?? profile.user.createdAt;
      const endDate =
        profile.user.trialEndsAt ?? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        id: profile.userId,
        clinicId: profile.userId,
        clinicName: profile.clinicName,
        planId,
        planName: plan?.name ?? planId,
        status: profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active' : 'Expired',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        amount: profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? plan?.price ?? 1999 : 0,
        currency: plan?.currency ?? 'INR',
      };
    });

    // Combine with mock subscriptions (KJ Clinic, XY)
    const dbClinicIds = new Set(dbSubscriptions.map((subscription) => subscription.clinicId));
    const mockSubscriptions = adminStoreService
      .getSubscriptions()
      .filter((subscription) => !dbClinicIds.has(subscription.clinicId));
    
    return [...dbSubscriptions, ...mockSubscriptions];
  }

  async getPayments(): Promise<ClinicSubscriptionPayment[]> {
    const mockPayments = adminStoreService.getPayments();
    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    const profiles = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    const existingDoctorPaymentKeys = new Set(
      mockPayments.map((payment) => `${payment.clinicId}:${payment.planId}`),
    );

    const dbPayments = profiles
      .filter((profile) => !existingDoctorPaymentKeys.has(`${profile.userId}:${profile.user.subscribedPlanId ?? 'plan-starter'}`))
      .map((profile): ClinicSubscriptionPayment => {
        const planId = profile.user.subscribedPlanId ?? 'plan-starter';
        const plan = this.getPlanById(planId);
        const paidOn = profile.user.trialStartedAt ?? profile.user.createdAt;

        return {
          id: `pay-db-${profile.userId}-${planId}`,
          clinicId: profile.userId,
          clinicName: profile.clinicName,
          planId,
          planName: plan?.name ?? planId,
          amount: plan?.price ?? 1999,
          currency: plan?.currency ?? 'INR',
          paidOn: paidOn.toISOString().split('T')[0],
          status: 'Paid',
        };
      });

    return [...mockPayments, ...dbPayments];
  }

  createPlan(plan: SubscriptionPlan): SubscriptionPlan {
    return adminStoreService.addPlan(plan);
  }
}

export const adminBillingService = new AdminBillingService();
