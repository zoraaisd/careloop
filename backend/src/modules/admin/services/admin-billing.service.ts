import { adminStoreService } from './admin-store.service';
import type { AdminBillingResponse, BillingOverview, ClinicSubscriptionPayment, ClinicSubscriptionRecord, SubscriptionPlan } from '../types/admin.types';

class AdminBillingService {
  getOverview(): BillingOverview {
    const plans = adminStoreService.getPlans();
    const subscriptions = adminStoreService.getSubscriptions();
    const payments = adminStoreService.getPayments();

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

  getBillingData(): AdminBillingResponse {
    return {
      overview: this.getOverview(),
      plans: adminStoreService.getPlans(),
    };
  }

  getPlans(): SubscriptionPlan[] {
    return adminStoreService.getPlans();
  }

  getClinicSubscriptions(): ClinicSubscriptionRecord[] {
    return adminStoreService.getSubscriptions();
  }

  getPayments(): ClinicSubscriptionPayment[] {
    return adminStoreService.getPayments();
  }
}

export const adminBillingService = new AdminBillingService();
