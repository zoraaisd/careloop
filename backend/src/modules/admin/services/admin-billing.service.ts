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
    const payments = this.getPayments();
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

    const dbSubscriptions: ClinicSubscriptionRecord[] = profiles.map((profile) => ({
      id: profile.userId,
      clinicId: profile.userId,
      clinicName: profile.clinicName,
      planId: 'plan-starter',
      planName: profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Pro Plan' : 'Free Tier',
      status: profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active' : 'Expired',
      startDate: profile.user.createdAt.toISOString().split('T')[0],
      endDate: new Date(profile.user.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 2999 : 0,
      currency: 'INR',
    }));

    // Combine with mock subscriptions (KJ Clinic, XY)
    const mockSubscriptions = adminStoreService.getSubscriptions();
    
    return [...dbSubscriptions, ...mockSubscriptions];
  }

  getPayments(): ClinicSubscriptionPayment[] {
    // Combine mock payments with any real payment logic if needed
    return adminStoreService.getPayments();
  }

  createPlan(plan: SubscriptionPlan): SubscriptionPlan {
    return adminStoreService.addPlan(plan);
  }
}

export const adminBillingService = new AdminBillingService();
