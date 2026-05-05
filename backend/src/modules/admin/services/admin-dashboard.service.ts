import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import { adminStoreService } from './admin-store.service';
import type {
  AdminDashboardResponse,
  OwnerSignupChartPoint,
  RevenueTrendChartPoint,
} from '../types/admin.types';

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getSubscribedPlanAmount = (planId: string | null): number => {
  if (!planId) return 0;
  return PLAN_AMOUNTS[planId] ?? 0;
};

class AdminDashboardService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);

  async getDashboard(): Promise<AdminDashboardResponse> {
    const dashboard = adminStoreService.getDashboard();
    const supportTickets = adminStoreService.getSupportTickets();
    const payments = adminStoreService.getPayments();

    const now = new Date();
    // Build last 6 months range
    const last6Months: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
    }

    const [totalDoctors, pendingDoctorRequests, trialDbProfiles, expiredDbProfiles, allDbProfiles, activeDbProfiles] =
      await Promise.all([
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
          .andWhere('user.trial_ends_at > :now', { now })
          .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
          .getCount(),
        this.doctorProfileRepository
          .createQueryBuilder('profile')
          .innerJoin('profile.user', 'user')
          .where('user.role = :role', { role: UserRole.DOCTOR })
          .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.INACTIVE })
          .andWhere('user.approval_status = :approval', { approval: DoctorApprovalStatus.APPROVED })
          .andWhere('user.trial_ends_at <= :now', { now })
          .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
          .getCount(),
        // All approved doctors for signups chart
        this.doctorProfileRepository
          .createQueryBuilder('profile')
          .innerJoinAndSelect('profile.user', 'user')
          .where('user.role = :role', { role: UserRole.DOCTOR })
          .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
          .getMany(),
        // Active (subscribed) doctors
        this.doctorProfileRepository
          .createQueryBuilder('profile')
          .innerJoinAndSelect('profile.user', 'user')
          .where('user.role = :role', { role: UserRole.DOCTOR })
          .andWhere('user.subscription_status = :status', { status: SubscriptionStatus.ACTIVE })
          .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics: DUMMY_CLINICS })
          .getMany(),
      ]);

    const uniqueDbClinics = new Set(allDbProfiles.map((p) => p.clinicName.trim().toLowerCase())).size;
    const mockClinicRequests = adminStoreService.getClinicRequests();
    const pendingMockClinics = mockClinicRequests.filter((r) => r.status === 'Pending').length;

    const existingMockPaymentKeys = new Set(
      payments.map((p) => `${p.clinicId}:${p.planId}`)
    );

    const dbRevenue = activeDbProfiles
      .filter((p) => !existingMockPaymentKeys.has(`${p.userId}:${p.user.subscribedPlanId}`))
      .reduce((sum, profile) => {
        return sum + getSubscribedPlanAmount(profile.user.subscribedPlanId);
      }, 0);

    const totalRevenueAmount = payments.reduce((sum, p) => sum + p.amount, 0) + dbRevenue;

    // ── Revenue Trend Chart ──────────────────────────────────────────────────
    // Bucket active doctors by the month they subscribed (using createdAt as proxy)
    const revenueTrend: RevenueTrendChartPoint[] = last6Months.map(({ year, month, label }) => {
      const monthRevenue = activeDbProfiles
        .filter((p) => {
          const d = new Date(p.user.createdAt);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, p) => sum + getSubscribedPlanAmount(p.user.subscribedPlanId), 0);

      return { label, revenue: monthRevenue };
    });

    // ── Owner Signups Chart ──────────────────────────────────────────────────
    const ownerSignups: OwnerSignupChartPoint[] = last6Months.map(({ year, month, label }) => {
      const monthDoctors = allDbProfiles.filter((p) => {
        const d = new Date(p.user.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const Active = monthDoctors.filter((p) => p.user.subscriptionStatus === SubscriptionStatus.ACTIVE).length;
      const Trial = monthDoctors.filter(
        (p) =>
          p.user.subscriptionStatus === SubscriptionStatus.INACTIVE &&
          p.user.trialEndsAt !== null &&
          new Date(p.user.trialEndsAt) > now,
      ).length;
      const Expired = monthDoctors.filter(
        (p) =>
          p.user.subscriptionStatus === SubscriptionStatus.INACTIVE &&
          (p.user.trialEndsAt === null || new Date(p.user.trialEndsAt) <= now),
      ).length;
      const Total = monthDoctors.length;

      return { name: label, Active, Trial, Expired, Total };
    });

    return {
      ...dashboard,
      summary: {
        ...dashboard.summary,
        totalDoctors: totalDoctors + dashboard.summary.totalDoctors,
        pendingDoctorRequests,
        pendingClinicRequests: pendingDoctorRequests + pendingMockClinics,
        trialUsers: trialDbProfiles + dashboard.summary.trialUsers,
        expiredUsers: expiredDbProfiles + ((dashboard.summary as any).expiredUsers || 0),
        totalClinics: uniqueDbClinics,
        activeSubscriptions: activeDbProfiles.length,
        revenueStatistics: `Rs ${totalRevenueAmount.toLocaleString('en-IN')}`,
        totalTransactions: payments.length,
        openTickets:
          supportTickets.filter((t) => t.status === 'Open').length +
          (await AppDataSource.getRepository(SupportTicket).count({ where: { status: 'Open' as any } })),
        inProgressTickets:
          supportTickets.filter((t) => t.status === 'In Progress').length +
          (await AppDataSource.getRepository(SupportTicket).count({ where: { status: 'In Progress' as any } })),
        whatsappMessagesSent: 0,
      },
      charts: {
        ...dashboard.charts,
        revenueTrend,
        ownerSignups,
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

    return doctors.map((doc) => {
      const isSubscribed = doc.user.subscriptionStatus === SubscriptionStatus.ACTIVE;
      const isTrial = !isSubscribed && doc.user.trialEndsAt && new Date(doc.user.trialEndsAt) > new Date();

      const expirationDate = isSubscribed
        ? (() => {
            const d = new Date(doc.user.createdAt);
            d.setFullYear(d.getFullYear() + 1);
            return d;
          })()
        : doc.user.trialEndsAt
          ? new Date(doc.user.trialEndsAt)
          : doc.user.createdAt;

      const planId = doc.user.subscribedPlanId;
      const planNames: Record<string, string> = {
        'plan-starter': 'Starter Plan',
        'plan-pro': 'Pro Plan',
        'plan-enterprise': 'Enterprise Plan',
        'plan-free-trial': '7-Day Trial',
      };

      const planName = isSubscribed
        ? planId
          ? planNames[planId] || 'Premium Plan'
          : 'Premium Plan'
        : isTrial
          ? '7-Day Trial'
          : 'Trial Expired';

      return {
        id: doc.id,
        doctorName: doc.user.name,
        clinicName: doc.clinicName,
        planName,
        expirationDate:
          expirationDate instanceof Date
            ? expirationDate.toISOString()
            : new Date(expirationDate).toISOString(),
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

    return doctors.map((doc) => ({
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

    return doctors.map((doc) => {
      const planId = doc.user.subscribedPlanId;
      const planNames: Record<string, string> = {
        'plan-starter': 'Starter Plan',
        'plan-pro': 'Pro Plan',
        'plan-enterprise': 'Enterprise Plan',
      };
      const planName = planId ? planNames[planId] || 'Premium Plan' : 'Premium Plan';

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
