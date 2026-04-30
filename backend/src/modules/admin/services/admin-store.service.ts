import { AppError } from '../../../common/errors/app-error';
import {
  adminProfileSeed,
  clinicRequestSeed,
  clinicSeed,
  clinicSubscriptionSeed,
  dashboardSeed,
  paymentSeed,
  revenueSeed,
  subscriptionPlanSeed,
  supportResponseSeed,
  supportTicketSeed,
} from '../data/admin.mock-data';
import type {
  AdminClinic,
  AdminDashboardResponse,
  AdminProfile,
  ClinicRequest,
  ClinicSubscriptionPayment,
  ClinicSubscriptionRecord,
  RevenueStatisticsResponse,
  SubscriptionPlan,
  SupportTicket,
  SupportTicketResponseLog,
} from '../types/admin.types';

type AdminStoreState = {
  profile: AdminProfile;
  dashboard: AdminDashboardResponse;
  plans: SubscriptionPlan[];
  clinics: AdminClinic[];
  clinicRequests: ClinicRequest[];
  payments: ClinicSubscriptionPayment[];
  subscriptions: ClinicSubscriptionRecord[];
  revenue: RevenueStatisticsResponse;
  supportTickets: SupportTicket[];
  supportResponses: SupportTicketResponseLog[];
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class AdminStoreService {
  private readonly state: AdminStoreState = {
    profile: clone(adminProfileSeed),
    dashboard: clone(dashboardSeed),
    plans: clone(subscriptionPlanSeed),
    clinics: clone(clinicSeed),
    clinicRequests: clone(clinicRequestSeed),
    payments: clone(paymentSeed),
    subscriptions: clone(clinicSubscriptionSeed),
    revenue: clone(revenueSeed),
    supportTickets: clone(supportTicketSeed),
    supportResponses: clone(supportResponseSeed),
  };

  getProfile(): AdminProfile {
    return clone(this.state.profile);
  }

  saveProfile(profile: AdminProfile): AdminProfile {
    this.state.profile = clone(profile);
    return this.getProfile();
  }

  getDashboard(): AdminDashboardResponse {
    const dashboard = clone(this.state.dashboard);
    dashboard.summary.totalClinics = this.state.clinics.length;
    dashboard.summary.activeSubscriptions = this.state.subscriptions.filter(s => s.status === 'Active').length;
    dashboard.summary.trialUsers = this.state.subscriptions.filter(s => (s.status as any) === 'Trial').length;
    dashboard.summary.pendingClinicRequests = this.state.clinicRequests.filter(r => r.status === 'Pending').length;
    
    // Total Doctors is a bit tricky since we don't have a global doctor list in AdminStore yet,
    // but we can sum doctors from clinics and trial subscriptions.
    const clinicDoctors = this.state.clinics.reduce((sum, c) => sum + (c.doctors || 0), 0);
    dashboard.summary.totalDoctors = clinicDoctors;
    
    const totalRevenue = this.state.payments.reduce((sum, p) => sum + p.amount, 0);
    dashboard.summary.revenueStatistics = `Rs ${totalRevenue.toLocaleString('en-IN')}`;
    
    return dashboard;
  }

  getPlans(): SubscriptionPlan[] {
    return clone(this.state.plans);
  }

  getPlanByName(name: string): SubscriptionPlan | undefined {
    return this.state.plans.find((plan) => plan.name.toLowerCase() === name.toLowerCase());
  }

  addPlan(plan: SubscriptionPlan): SubscriptionPlan {
    this.state.plans.push(clone(plan));
    return clone(plan);
  }

  getClinics(): AdminClinic[] {
    return clone(this.state.clinics);
  }

  getClinicById(id: string): AdminClinic {
    const clinic = this.state.clinics.find((item) => item.id === id);
    if (!clinic) {
      throw new AppError('Clinic not found', 404);
    }

    return clone(clinic);
  }

  addClinic(clinic: AdminClinic): AdminClinic {
    this.state.clinics.unshift(clone(clinic));
    return clone(clinic);
  }

  deleteClinic(id: string): void {
    const initialLength = this.state.clinics.length;
    this.state.clinics = this.state.clinics.filter((clinic) => clinic.id !== id);

    if (this.state.clinics.length === initialLength) {
      throw new AppError('Clinic not found', 404);
    }
  }

  purgeClinicPaymentsAndSubscriptions(clinicId: string): void {
    this.state.payments = this.state.payments.filter((p) => p.clinicId !== clinicId);
    this.state.subscriptions = this.state.subscriptions.filter((s) => s.clinicId !== clinicId);
  }

  recordDoctorSubscription(subscription: ClinicSubscriptionRecord): void {
    // Remove any existing subscription for the same clinic to avoid duplicates
    this.state.subscriptions = this.state.subscriptions.filter((s) => s.clinicId !== subscription.clinicId);
    this.state.subscriptions.unshift(clone(subscription));

    // Also add a payment record
    const payment: ClinicSubscriptionPayment = {
      id: `pay-doctor-${subscription.clinicId}-${Date.now()}`,
      clinicId: subscription.clinicId,
      clinicName: subscription.clinicName,
      planId: subscription.planId,
      planName: subscription.planName,
      amount: subscription.amount,
      currency: subscription.currency,
      paidOn: subscription.startDate,
      status: 'Paid',
    };
    // Do NOT filter out previous payments so that revenue stacks up
    this.state.payments.unshift(clone(payment));
  }

  getClinicRequests(): ClinicRequest[] {
    return clone(this.state.clinicRequests);
  }

  updateClinicRequestStatus(id: string, status: ClinicRequest['status']): ClinicRequest {
    const request = this.state.clinicRequests.find((item) => item.id === id);
    if (!request) {
      throw new AppError('Clinic request not found', 404);
    }

    request.status = status;
    return clone(request);
  }

  getPayments(): ClinicSubscriptionPayment[] {
    return clone(this.state.payments);
  }

  getSubscriptions(): ClinicSubscriptionRecord[] {
    return clone(this.state.subscriptions);
  }

  getRevenue(): RevenueStatisticsResponse {
    return clone(this.state.revenue);
  }

  getSupportTickets(): SupportTicket[] {
    return clone(this.state.supportTickets);
  }

  getSupportTicketById(id: string): SupportTicket {
    const ticket = this.state.supportTickets.find((item) => item.id === id);
    if (!ticket) {
      throw new AppError('Support ticket not found', 404);
    }

    return clone(ticket);
  }

  addSupportResponse(response: SupportTicketResponseLog): SupportTicketResponseLog {
    this.state.supportResponses.unshift(clone(response));

    const ticket = this.state.supportTickets.find((item) => item.id === response.ticketId);
    if (ticket && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    return clone(response);
  }

  getSupportResponses(ticketId?: string): SupportTicketResponseLog[] {
    const responses = ticketId
      ? this.state.supportResponses.filter((response) => response.ticketId === ticketId)
      : this.state.supportResponses;

    return clone(responses);
  }
}

export const adminStoreService = new AdminStoreService();
