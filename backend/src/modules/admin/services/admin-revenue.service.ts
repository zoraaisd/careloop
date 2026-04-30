import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { SubscriptionStatus, UserRole } from '../../../entities/user.entity';
import { adminStoreService } from './admin-store.service';
import type { RevenueStatisticsResponse } from '../types/admin.types';

const PLAN_AMOUNTS: Record<string, number> = {
  'plan-starter': 1999,
  'plan-pro': 4999,
  'plan-enterprise': 14999,
};

const DUMMY_CLINICS = [
  'Green Valley Clinic',
  'Healthy Path Care',
  'Prime Ortho Center',
  'Bright Smile Clinic',
  'Advanced Health Care',
  'Life Line Hospital',
];

class AdminRevenueService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);

  async getRevenueStatistics(): Promise<RevenueStatisticsResponse> {
    // --- Mock store data (KJ Clinic, XY Multispecialty, etc.) ---
    const mockPayments = adminStoreService.getPayments();
    const mockSubscriptions = adminStoreService.getSubscriptions();

    // --- Real DB data ---
    const dbProfiles = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('profile.clinic_name NOT IN (:...dummies)', { dummies: DUMMY_CLINICS })
      .orderBy('user.createdAt', 'ASC')
      .getMany();

    const activeDbProfiles = dbProfiles.filter(
      (p) => p.user.subscriptionStatus === SubscriptionStatus.ACTIVE,
    );

    // Build revenue trend by month (last 6 calendar months)
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('en-US', { month: 'short' }));
    }

    // Compute per-month amounts from mock payments
    const mockPaidPayments = mockPayments.filter((p) => p.status === 'Paid');

    // Revenue trend: combine mock + DB subscriptions
    const revenueTrend = months.map((month, idx) => {
      const monthIndex = (now.getMonth() - 5 + idx + 12) % 12;
      const year = now.getFullYear() - (now.getMonth() - 5 + idx < 0 ? 1 : 0);

      // Mock payments for this month
      const mockMonthly = mockPaidPayments
        .filter((p) => {
          const d = new Date(p.paidOn);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // DB active subscriptions that started in or before this month
      const dbMonthly = activeDbProfiles
        .filter((profile) => {
          const d = new Date(profile.user.createdAt);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
        .reduce((sum) => sum + 2999, 0);

      return { month, monthlyAmount: mockMonthly + dbMonthly };
    });

    // Convert to cumulative yearly
    let cumulativeYearly = 0;
    const revenueTrendFull = revenueTrend.map(({ month, monthlyAmount }) => {
      cumulativeYearly += monthlyAmount;
      return { month, monthly: monthlyAmount, yearly: cumulativeYearly };
    });

    // Current month revenue
    const currentMonthRevenue = revenueTrendFull.at(-1)?.monthly ?? 0;
    const previousMonthRevenue = revenueTrendFull.at(-2)?.monthly ?? 0;

    // Subscription growth %
    let growthStr = '0%';
    if (previousMonthRevenue > 0) {
      const pct = Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);
      growthStr = `${pct >= 0 ? '+' : ''}${pct}%`;
    } else if (currentMonthRevenue > 0) {
      growthStr = '+100%';
    }

    const totalYearly = cumulativeYearly;

    // Clinic revenue distribution by plan
    const planTotals: Record<string, number> = {};
    for (const p of mockPaidPayments) {
      planTotals[p.planName] = (planTotals[p.planName] ?? 0) + p.amount;
    }
    for (const profile of activeDbProfiles) {
      const planName = 'Standard Plan';
      planTotals[planName] = (planTotals[planName] ?? 0) + 2999;
    }

    const totalForDist = Object.values(planTotals).reduce((s, v) => s + v, 0);
    const clinicRevenueDistribution = Object.entries(planTotals).map(([name, value]) => ({
      name,
      value: totalForDist > 0 ? Math.round((value / totalForDist) * 100) : 0,
    }));

    if (clinicRevenueDistribution.length === 0) {
      clinicRevenueDistribution.push({ name: 'No Subscriptions', value: 100 });
    }

    // Mock subscriptions count for active subscriptions
    const mockActiveCount = mockSubscriptions.filter((s) => s.status === 'Active').length;
    const dbActiveCount = activeDbProfiles.length;
    const totalActive = mockActiveCount + dbActiveCount;

    return {
      overview: {
        monthlyRevenue: `Rs ${currentMonthRevenue.toLocaleString('en-IN')}`,
        yearlyRevenue: `Rs ${totalYearly.toLocaleString('en-IN')}`,
        subscriptionGrowth: growthStr,
        clinicRevenueDistribution: `${totalActive} active`,
      },
      revenueTrend: revenueTrendFull,
      clinicRevenueDistribution,
    };
  }
}

export const adminRevenueService = new AdminRevenueService();
