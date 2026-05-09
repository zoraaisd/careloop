import { AppDataSource } from '../../../config/data-source';
import { AdminClinicRecord } from '../../../entities/admin-clinic-record.entity';
import { AdminClinicRequest } from '../../../entities/admin-clinic-request.entity';
import { AdminPaymentRecord } from '../../../entities/admin-payment-record.entity';
import { AdminSubscriptionRecord } from '../../../entities/admin-subscription-record.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import type {
  AdminDashboardResponse,
  DashboardMetricTrend,
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
  private readonly clinicRepository = AppDataSource.getRepository(AdminClinicRecord);
  private readonly clinicRequestRepository =
    AppDataSource.getRepository(AdminClinicRequest);
  private readonly paymentRepository =
    AppDataSource.getRepository(AdminPaymentRecord);
  private readonly subscriptionRepository =
    AppDataSource.getRepository(AdminSubscriptionRecord);

  private createMonthRange(date: Date) {
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    };
  }

  private isWithinRange(value: Date | string | null | undefined, start: Date, end: Date) {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return date >= start && date < end;
  }

  private toTrend(current: number, previous: number, label: string): DashboardMetricTrend {
    if (previous === 0) {
      return {
        value: current > 0 ? '+100%' : '0%',
        isUp: current >= previous,
        label,
      };
    }

    const rawPercentage = ((current - previous) / previous) * 100;
    const roundedPercentage = Math.round(rawPercentage);

    return {
      value: `${roundedPercentage >= 0 ? '+' : ''}${roundedPercentage}%`,
      isUp: roundedPercentage >= 0,
      label,
    };
  }

  async getDashboard(): Promise<AdminDashboardResponse> {
    const [payments, subscriptionRecords] = await Promise.all([
      this.paymentRepository.find(),
      this.subscriptionRepository.find(),
    ]);

    const now = new Date();
    const currentMonthRange = this.createMonthRange(now);
    const previousMonthRange = this.createMonthRange(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
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
    const pendingManualRequests = await this.clinicRequestRepository.count({
      where: { status: 'Pending' },
    });
    const manualClinicCount = await this.clinicRepository.count();
    const totalRevenueAmount = payments
      .filter((payment) => payment.status === 'Paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const currentMonthDoctorCount = allDbProfiles.filter((profile) =>
      this.isWithinRange(
        profile.user.createdAt,
        currentMonthRange.start,
        currentMonthRange.end,
      ),
    ).length;
    const previousMonthDoctorCount = allDbProfiles.filter((profile) =>
      this.isWithinRange(
        profile.user.createdAt,
        previousMonthRange.start,
        previousMonthRange.end,
      ),
    ).length;

    const currentMonthActiveSubscriptions = subscriptionRecords.filter(
      (subscription) =>
        subscription.status === 'Active' &&
        this.isWithinRange(
          subscription.createdAt,
          currentMonthRange.start,
          currentMonthRange.end,
        ),
    ).length;
    const previousMonthActiveSubscriptions = subscriptionRecords.filter(
      (subscription) =>
        subscription.status === 'Active' &&
        this.isWithinRange(
          subscription.createdAt,
          previousMonthRange.start,
          previousMonthRange.end,
        ),
    ).length;

    const currentMonthExpiredUsers = allDbProfiles.filter((profile) =>
      profile.user.subscriptionStatus === SubscriptionStatus.INACTIVE &&
      profile.user.approvalStatus === DoctorApprovalStatus.APPROVED &&
      profile.user.trialEndsAt !== null &&
      profile.user.trialEndsAt <= now &&
      this.isWithinRange(
        profile.user.trialEndsAt,
        currentMonthRange.start,
        currentMonthRange.end,
      ),
    ).length;
    const previousMonthExpiredUsers = allDbProfiles.filter((profile) =>
      profile.user.subscriptionStatus === SubscriptionStatus.INACTIVE &&
      profile.user.approvalStatus === DoctorApprovalStatus.APPROVED &&
      profile.user.trialEndsAt !== null &&
      this.isWithinRange(
        profile.user.trialEndsAt,
        previousMonthRange.start,
        previousMonthRange.end,
      ),
    ).length;

    const currentMonthRevenue = payments
      .filter(
        (payment) =>
          payment.status === 'Paid' &&
          this.isWithinRange(
            payment.paidOn,
            currentMonthRange.start,
            currentMonthRange.end,
          ),
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const previousMonthRevenue = payments
      .filter(
        (payment) =>
          payment.status === 'Paid' &&
          this.isWithinRange(
            payment.paidOn,
            previousMonthRange.start,
            previousMonthRange.end,
          ),
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // ── Revenue Trend Chart ──────────────────────────────────────────────────
    // Bucket active doctors by the month they subscribed (using createdAt as proxy)
    const revenueTrend: RevenueTrendChartPoint[] = last6Months.map(({ year, month, label }) => {
      const monthPayments = payments
        .filter((payment) => {
          const d = new Date(payment.paidOn);
          return (
            payment.status === 'Paid' &&
            d.getFullYear() === year &&
            d.getMonth() === month
          );
        })
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      return { label, revenue: monthPayments };
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
      summary: {
        totalDoctors,
        pendingDoctorRequests,
        pendingClinicRequests: pendingDoctorRequests + pendingManualRequests,
        trialUsers: trialDbProfiles,
        expiredUsers: expiredDbProfiles,
        totalClinics: uniqueDbClinics + manualClinicCount,
        activeSubscriptions: activeDbProfiles.length,
        revenueStatistics: `Rs ${totalRevenueAmount.toLocaleString('en-IN')}`,
        totalTransactions: payments.length,
        openTickets: await AppDataSource.getRepository(SupportTicket).count({ where: { status: 'Open' as any } }),
        inProgressTickets: await AppDataSource.getRepository(SupportTicket).count({ where: { status: 'In Progress' as any } }),
        whatsappMessagesSent: 0,
      },
      trends: {
        totalDoctors: this.toTrend(
          currentMonthDoctorCount,
          previousMonthDoctorCount,
          'vs last month',
        ),
        activeSubscriptions: this.toTrend(
          currentMonthActiveSubscriptions,
          previousMonthActiveSubscriptions,
          'vs last month',
        ),
        expiredUsers: this.toTrend(
          currentMonthExpiredUsers,
          previousMonthExpiredUsers,
          'vs last month',
        ),
        revenueStatistics: this.toTrend(
          currentMonthRevenue,
          previousMonthRevenue,
          'vs last month',
        ),
      },
      recentClinics: [],
      charts: {
        systemActivity: [
          { label: 'Mon', logins: 0, tasks: 0 },
          { label: 'Tue', logins: 0, tasks: 0 },
          { label: 'Wed', logins: 0, tasks: 0 },
          { label: 'Thu', logins: 0, tasks: 0 },
          { label: 'Fri', logins: 0, tasks: 0 },
          { label: 'Sat', logins: 0, tasks: 0 },
          { label: 'Sun', logins: 0, tasks: 0 },
        ],
        newClinicRegistrations: last6Months.map(({ label, year, month }) => ({
          label,
          clinics: allDbProfiles.filter((profile) => {
            const d = new Date(profile.user.createdAt);
            return d.getFullYear() === year && d.getMonth() === month;
          }).length,
        })),
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
