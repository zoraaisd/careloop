export type AdminMetric = {
  title: string;
  value: number | string;
  description?: string;
};

export type AdminClinicStatus =
  | 'Active'
  | 'Pending Approval'
  | 'Suspended'
  | 'Approved'
  | 'Pending'
  | 'Under Review';

export type SubscriptionPlanStatus = 'Active' | 'Inactive' | 'Archived';

export type PaymentStatus = 'Paid' | 'Failed' | 'Pending' | 'Refunded';

export type SupportTicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type SupportTicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ResponseMethod = 'email' | 'whatsapp';

export interface RecentClinic {
  id: string;
  clinicName: string;
  ownerName: string;
  city: string;
  status: AdminClinicStatus;
  createdAt: string;
}

export interface AdminDashboardSummary {
  totalDoctors: number;
  pendingDoctorRequests: number;
  pendingClinicRequests: number;
  totalPatients: number;
  activeSubscriptions: number;
  revenueStatistics: string;
  whatsappMessagesSent: number;
  totalClinics: number;
}

export interface DashboardChartPoint {
  label: string;
  logins?: number;
  tasks?: number;
  clinics?: number;
  monthly?: number;
  yearly?: number;
}

export interface AdminDashboardResponse {
  summary: AdminDashboardSummary;
  recentClinics: RecentClinic[];
  charts: {
    systemActivity: DashboardChartPoint[];
    newClinicRegistrations: DashboardChartPoint[];
  };
}

export interface AdminProfile {
  id: string;
  adminName: string;
  email: string;
  phoneNumber: string;
  role: string;
  organizationName: string;
  location: string;
  accountCreatedDate: string;
  profileImageUrl: string | null;
}

export interface BillingOverview {
  totalPlans: number;
  activeSubscriptions: number;
  monthlyRevenue: string;
  expiredSubscriptions: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'month' | 'year';
  doctorsLimit: number;
  patientsLimit: number;
  whatsappLimit: number;
  status: SubscriptionPlanStatus;
}

export interface ClinicSubscriptionPayment {
  id: string;
  clinicId: string;
  clinicName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paidOn: string;
  status: PaymentStatus;
}

export interface ClinicSubscriptionRecord {
  id: string;
  clinicId: string;
  clinicName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Pending';
  amount: number;
  currency: string;
}

export interface AdminBillingResponse {
  overview: BillingOverview;
  plans: SubscriptionPlan[];
}

export interface AdminClinic {
  id: string;
  clinicName: string;
  ownerName: string;
  address: string;
  city: string;
  contact: string;
  email?: string;
  subscriptionPlan: string;
  doctors: number;
  patients: number;
  status: AdminClinicStatus;
  createdAt: string;
}

export interface ClinicListOverview {
  totalClinics: number;
  activeClinics: number;
  pendingApprovalClinics: number;
  suspendedClinics: number;
}

export interface ClinicRequest {
  id: string;
  clinicId?: string;
  clinic: string;
  city: string;
  owner: string;
  requestedOn: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  contact?: string;
  email?: string;
}

export interface AdminClinicListResponse {
  overview: ClinicListOverview;
  clinics: AdminClinic[];
}

export interface RevenueTrendPoint {
  month: string;
  monthly: number;
  yearly: number;
}

export interface RevenueDistributionPoint {
  name: string;
  value: number;
}

export interface RevenueOverview {
  monthlyRevenue: string;
  yearlyRevenue: string;
  subscriptionGrowth: string;
  clinicRevenueDistribution: string;
}

export interface RevenueStatisticsResponse {
  overview: RevenueOverview;
  revenueTrend: RevenueTrendPoint[];
  clinicRevenueDistribution: RevenueDistributionPoint[];
}

export interface SupportTicket {
  id: string;
  clinicId?: string;
  clinicName: string;
  issueTitle: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdDate: string;
  clinicEmail?: string;
  clinicPhone?: string;
}

export interface SupportTicketResponseLog {
  id: string;
  ticketId: string;
  method: ResponseMethod;
  message: string;
  attachmentName?: string;
  respondedAt: string;
  respondedBy: string;
}
