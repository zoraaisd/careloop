import { AppDataSource } from '../../../config/data-source';
import { AdminPaymentRecord } from '../../../entities/admin-payment-record.entity';
import { AdminSubscriptionPlan } from '../../../entities/admin-subscription-plan.entity';
import { AdminSubscriptionRecord } from '../../../entities/admin-subscription-record.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { SubscriptionStatus, UserRole } from '../../../entities/user.entity';
import type {
  AdminBillingResponse,
  BillingOverview,
  ClinicSubscriptionPayment,
  ClinicSubscriptionRecord,
  SubscriptionPlan,
} from '../types/admin.types';

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    description: 'Perfect for solo practitioners & small clinics',
    price: 1999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 2,
    patientsLimit: 3,
    whatsappLimit: 1000,
    status: 'Active',
  },
  {
    id: 'plan-free-trial',
    name: 'Free Trial',
    description: '7-day full access for new clinics',
    price: 0,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 1,
    patientsLimit: 3,
    whatsappLimit: 200,
    status: 'Active',
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    description: 'Advanced features for growing clinics',
    price: 4999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 10,
    patientsLimit: 5000,
    whatsappLimit: 10000,
    status: 'Active',
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    description: 'Full power for large hospitals',
    price: 14999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 50,
    patientsLimit: 50000,
    whatsappLimit: 100000,
    status: 'Active',
  },
];

class AdminBillingService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly planRepository = AppDataSource.getRepository(
    AdminSubscriptionPlan,
  );
  private readonly subscriptionRepository = AppDataSource.getRepository(
    AdminSubscriptionRecord,
  );
  private readonly paymentRepository =
    AppDataSource.getRepository(AdminPaymentRecord);

  async ensureDefaultPlans(): Promise<void> {
    const count = await this.planRepository.count();
    if (count > 0) {
      return;
    }

    const plans = DEFAULT_PLANS.map((plan) => this.planRepository.create(plan));
    await this.planRepository.save(plans);
  }

  async getOverview(): Promise<BillingOverview> {
    const plans = await this.getPlans();
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
      plans: await this.getPlans(),
    };
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    await this.ensureDefaultPlans();
    const plans = await this.planRepository.find({
      order: { createdAt: 'ASC' },
    });
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      doctorsLimit: plan.doctorsLimit,
      patientsLimit: plan.patientsLimit,
      whatsappLimit: plan.whatsappLimit,
      status: plan.status,
    }));
  }

  async getClinicSubscriptions(): Promise<ClinicSubscriptionRecord[]> {
    const dbSubscriptions = await this.subscriptionRepository.find({
      order: { createdAt: 'DESC' },
    });

    const latestByClinic = new Map<string, AdminSubscriptionRecord>();
    dbSubscriptions.forEach((subscription) => {
      if (!latestByClinic.has(subscription.clinicId)) {
        latestByClinic.set(subscription.clinicId, subscription);
      }
    });

    const mappedSubscriptions = Array.from(latestByClinic.values()).map(
      (subscription) => ({
        id: subscription.id,
        clinicId: subscription.clinicId,
        clinicName: subscription.clinicName,
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: Number(subscription.amount),
        currency: subscription.currency,
      }),
    ) as ClinicSubscriptionRecord[];

    const existingClinicIds = new Set(
      mappedSubscriptions.map((subscription) => subscription.clinicId),
    );

    const profiles = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    const fallbackSubscriptions: ClinicSubscriptionRecord[] = profiles
      .filter((profile) => !existingClinicIds.has(profile.userId))
      .map((profile) => {
        const planId = profile.user.subscribedPlanId ?? 'plan-starter';
        const startDate = profile.user.trialStartedAt ?? profile.user.createdAt;
        const endDate =
          profile.user.trialEndsAt ??
          new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        return {
          id: profile.userId,
          clinicId: profile.userId,
          clinicName: profile.clinicName,
          planId,
          planName: planId,
          status:
            profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE
              ? 'Active'
              : 'Expired',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          amount: 0,
          currency: 'INR',
        };
      });

    const plans = await this.getPlans();
    const planMap = new Map(plans.map((plan) => [plan.id, plan]));

    return [...mappedSubscriptions, ...fallbackSubscriptions].map(
      (subscription) => {
        const plan = planMap.get(subscription.planId);
        return {
          ...subscription,
          planName: plan?.name ?? subscription.planName,
          amount: subscription.amount || plan?.price || 0,
          currency: plan?.currency ?? subscription.currency,
        };
      },
    );
  }

  async getPayments(): Promise<ClinicSubscriptionPayment[]> {
    const dbPayments = await this.paymentRepository.find({
      order: { paidOn: 'DESC', createdAt: 'DESC' },
    });

    return dbPayments.map((payment) => ({
      id: payment.id,
      clinicId: payment.clinicId,
      clinicName: payment.clinicName,
      planId: payment.planId,
      planName: payment.planName,
      amount: Number(payment.amount),
      currency: payment.currency,
      paidOn: payment.paidOn,
      status: payment.status,
    }));
  }

  async createPlan(
    plan: Omit<SubscriptionPlan, 'id'>,
  ): Promise<SubscriptionPlan> {
    await this.ensureDefaultPlans();
    const created = this.planRepository.create({
      id: `plan-${Date.now()}`,
      ...plan,
    });
    const saved = await this.planRepository.save(created);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      price: Number(saved.price),
      currency: saved.currency,
      billingCycle: saved.billingCycle,
      doctorsLimit: saved.doctorsLimit,
      patientsLimit: saved.patientsLimit,
      whatsappLimit: saved.whatsappLimit,
      status: saved.status,
    };
  }
}

export const adminBillingService = new AdminBillingService();
