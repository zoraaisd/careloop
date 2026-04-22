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
    return dashboard;
  }

  getPlans(): SubscriptionPlan[] {
    return clone(this.state.plans);
  }

  getPlanByName(name: string): SubscriptionPlan | undefined {
    return this.state.plans.find((plan) => plan.name.toLowerCase() === name.toLowerCase());
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
