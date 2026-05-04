import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { adminStoreService } from './admin-store.service';
import type { AdminDashboardResponse } from '../types/admin.types';

const DUMMY_CLINICS = [
  'Green Valley Clinic',
  'Healthy Path Care',
  'Prime Ortho Center',
  'Bright Smile Clinic',
  'Advanced Health Care',
  'Life Line Hospital',
];

const PLAN_AMOUNTS: Record<string, number> = {
  'plan-starter': 1999,
  'plan-pro': 4999,
  'plan-enterprise': 14999,
};

class AdminDashboardService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);

  async getDashboard(): Promise<AdminDashboardResponse> {
    const dashboard = adminStoreService.getDashboard();

    const [totalDoctors, pendingDoctorRequests, trialDbProfiles, profiles, activeDbProfiles] = await Promise.all([
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoin('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
        .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
        .getCount(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoin('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.PENDING })
        .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
        .getCount(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoin('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.INACTIVE })
        .andWhere('user.approval_status = :approval', { approval: DoctorApprovalStatus.APPROVED })
        .andWhere('user.trial_ends_at > :now', { now: new Date() })
        .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
        .getCount(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoinAndSelect('profile.user', 'user')
        .where('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
        .getMany(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoinAndSelect('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.ACTIVE })
        .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
        .getMany(),
    ]);

    const uniqueDbClinics = new Set(profiles.map(p => p.clinicName.trim().toLowerCase())).size;
    const subscriptions = adminStoreService.getSubscriptions();
    const payments = adminStoreService.getPayments();
    const mockClinicRequests = adminStoreService.getClinicRequests();
    const pendingMockClinics = mockClinicRequests.filter(r => r.status === 'Pending').length;

    const mockActiveSubscriptions = subscriptions.filter(s => s.status === 'Active').length;
    const totalActiveSubscriptions = mockActiveSubscriptions + activeDbProfiles.length;

    // Revenue = mock paid payments + DB active subscriptions with actual plan pricing
    const mockRevenue = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const dbRevenue = activeDbProfiles.reduce((sum, profile) => {
      const planId = profile.user.subscribedPlanId || 'plan-starter';
      return sum + (PLAN_AMOUNTS[planId] || 1999);
    }, 0);

    const totalRevenue = mockRevenue + dbRevenue;

    return {
      ...dashboard,
      summary: {
        ...dashboard.summary,
        totalDoctors: totalDoctors + dashboard.summary.totalDoctors,
        pendingDoctorRequests,
        pendingClinicRequests: pendingDoctorRequests + pendingMockClinics,
        trialUsers: trialDbProfiles + dashboard.summary.trialUsers,
        totalClinics: uniqueDbClinics, // Only count unique clinics from DB
        activeSubscriptions: totalActiveSubscriptions, // Correctly aggregate active subscriptions
        revenueStatistics: `Rs ${totalRevenue.toLocaleString('en-IN')}`,
      },
    };
  }

  async getAllDoctors() {
    const doctors = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
      .getMany();

    return doctors.map(doc => {
      const isSubscribed = doc.user.subscriptionStatus === SubscriptionStatus.ACTIVE;
      const isTrial = !isSubscribed && doc.user.trialEndsAt && new Date(doc.user.trialEndsAt) > new Date();

      const expirationDate = isSubscribed
        ? (() => { const d = new Date(doc.user.createdAt); d.setFullYear(d.getFullYear() + 1); return d; })()
        : (doc.user.trialEndsAt ? new Date(doc.user.trialEndsAt) : doc.user.createdAt);

      const planId = doc.user.subscribedPlanId;
      const planNames: Record<string, string> = {
        'plan-starter': 'Starter Plan',
        'plan-pro': 'Pro Plan',
        'plan-enterprise': 'Enterprise Plan',
        'plan-free-trial': '7-Day Trial'
      };
      
      const planName = isSubscribed 
        ? (planId ? (planNames[planId] || 'Premium Plan') : 'Premium Plan')
        : (isTrial ? '7-Day Trial' : 'Trial Expired');

      return {
        id: doc.id,
        doctorName: doc.user.name,
        clinicName: doc.clinicName,
        planName,
        expirationDate: expirationDate instanceof Date ? expirationDate.toISOString() : new Date(expirationDate).toISOString(),
      };
    });
  }

  async getTrialUsers() {
    const doctors = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.INACTIVE })
      .andWhere('user.approval_status = :approval', { approval: DoctorApprovalStatus.APPROVED })
      .andWhere('user.trial_ends_at > :now', { now: new Date() })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
      .getMany();

    return doctors.map(doc => ({
      id: doc.id,
      doctorName: doc.user.name,
      clinicName: doc.clinicName,
      planName: '7-Day Trial',
      expirationDate: doc.user.trialEndsAt?.toISOString() ?? doc.user.createdAt.toISOString(),
    }));
  }

  async getSubscribedUsers() {
    const doctors = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
      .getMany();

    return doctors.map(doc => {
      const planId = doc.user.subscribedPlanId;
      const planNames: Record<string, string> = {
        'plan-starter': 'Starter Plan',
        'plan-pro': 'Pro Plan',
        'plan-enterprise': 'Enterprise Plan'
      };
      const planName = planId ? (planNames[planId] || 'Premium Plan') : 'Premium Plan';

      // Mock expiration: 1 year from creation for DB Active subs
      const expirationDate = new Date(doc.user.createdAt);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      return {
        id: doc.id,
        doctorName: doc.user.name,
        clinicName: doc.clinicName,
        planName,
        expirationDate: expirationDate.toISOString(),
      };
    });
  }
}

export const adminDashboardService = new AdminDashboardService();
