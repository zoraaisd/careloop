import { AppDataSource } from '../../../config/data-source';
import { AdminPaymentRecord } from '../../../entities/admin-payment-record.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { SubscriptionStatus, UserRole } from '../../../entities/user.entity';
import type { RevenueStatisticsResponse } from '../types/admin.types';

class AdminRevenueService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly paymentRepository =
    AppDataSource.getRepository(AdminPaymentRecord);

  async getRevenueStatistics(): Promise<RevenueStatisticsResponse> {
    const paymentRecords = await this.paymentRepository.find();

    const dbProfiles = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
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

    const paidPayments = paymentRecords.filter((payment) => payment.status === 'Paid');

    // Revenue trend: combine mock + DB subscriptions
    const revenueTrend = months.map((month, idx) => {
      const monthIndex = (now.getMonth() - 5 + idx + 12) % 12;
      const year = now.getFullYear() - (now.getMonth() - 5 + idx < 0 ? 1 : 0);

      const paymentMonthly = paidPayments
        .filter((p) => {
          const d = new Date(p.paidOn);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return { month, monthlyAmount: paymentMonthly };
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
    for (const p of paidPayments) {
      planTotals[p.planName] = (planTotals[p.planName] ?? 0) + Number(p.amount);
    }

    const totalForDist = Object.values(planTotals).reduce((s, v) => s + v, 0);
    const clinicRevenueDistribution = Object.entries(planTotals).map(([name, value]) => ({
      name,
      value: totalForDist > 0 ? Math.round((value / totalForDist) * 100) : 0,
    }));

    if (clinicRevenueDistribution.length === 0) {
      clinicRevenueDistribution.push({ name: 'No Subscriptions', value: 100 });
    }

    const totalActive = activeDbProfiles.length;

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
