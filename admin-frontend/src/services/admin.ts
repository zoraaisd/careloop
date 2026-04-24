import { apiClient } from '@/services/api';

export type AdminClinicStatus =
  | 'Active'
  | 'Pending Approval'
  | 'Suspended'
  | 'Approved'
  | 'Pending'
  | 'Under Review';

export type SupportTicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type SupportTicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ResponseMethod = 'email' | 'whatsapp';
export type DoctorApprovalStatus = 'pending' | 'approved' | 'rejected';

export type DashboardResponse = {
  summary: {
    totalDoctors: number;
    totalPatients: number;
    activeSubscriptions: number;
    revenueStatistics: string;
    whatsappMessagesSent: number;
    totalClinics: number;
  };
  recentClinics: Array<{
    id: string;
    clinicName: string;
    ownerName: string;
    city: string;
    status: AdminClinicStatus;
    createdAt: string;
  }>;
  charts: {
    systemActivity: Array<{ label: string; logins?: number; tasks?: number }>;
    newClinicRegistrations: Array<{ label: string; clinics?: number }>;
  };
};

export type AdminProfile = {
  id: string;
  adminName: string;
  email: string;
  phoneNumber: string;
  role: string;
  organizationName: string;
  location: string;
  accountCreatedDate: string;
  profileImageUrl: string | null;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'month' | 'year';
  doctorsLimit: number;
  patientsLimit: number;
  whatsappLimit: number;
  status: 'Active' | 'Inactive' | 'Archived';
};

export type BillingResponse = {
  overview: {
    totalPlans: number;
    activeSubscriptions: number;
    monthlyRevenue: string;
    expiredSubscriptions: number;
  };
  plans: SubscriptionPlan[];
};

export type PaymentRecord = {
  id: string;
  clinicId: string;
  clinicName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paidOn: string;
  status: 'Paid' | 'Failed' | 'Pending' | 'Refunded';
};

export type ClinicListResponse = {
  overview: {
    totalClinics: number;
    activeClinics: number;
    pendingApprovalClinics: number;
    suspendedClinics: number;
  };
  clinics: Clinic[];
};

export type Clinic = {
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
};

export type CreateClinicPayload = {
  clinicName: string;
  ownerName: string;
  address: string;
  contact: string;
  subscriptionPlan: string;
  doctors: number;
  patients: number;
  status: 'Active' | 'Pending Approval' | 'Suspended';
  city?: string;
  email?: string;
};

export type ClinicRequest = {
  id: string;
  clinic: string;
  city: string;
  owner: string;
  requestedOn: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  contact?: string;
  email?: string;
};

export type RevenueResponse = {
  overview: {
    monthlyRevenue: string;
    yearlyRevenue: string;
    subscriptionGrowth: string;
    clinicRevenueDistribution: string;
  };
  revenueTrend: Array<{ month: string; monthly: number; yearly: number }>;
  clinicRevenueDistribution: Array<{ name: string; value: number }>;
};

export type SupportTicket = {
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
};

export type DoctorRequest = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  approvalStatus: DoctorApprovalStatus;
  subscriptionStatus: 'inactive' | 'active';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  specialization: string;
  experience: number;
  qualification: string;
  medicalRegistrationNumber: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  consultationFees: number;
  availableDays: string[];
  availableTimeSlots: string[];
  aboutDoctor: string | null;
  profileImageUrl: string | null;
  certificateUrl: string | null;
  createdAt: string;
};

export type SupportResponseLog = {
  id: string;
  ticketId: string;
  method: ResponseMethod;
  message: string;
  attachmentName?: string;
  respondedAt: string;
  respondedBy: string;
};

export type UpdateAdminProfilePayload = Partial<Pick<
  AdminProfile,
  'adminName' | 'email' | 'phoneNumber' | 'organizationName' | 'location' | 'profileImageUrl'
>> & {
  newPassword?: string;
};

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  if (currency === 'INR') {
    return `Rs ${amount.toLocaleString('en-IN')}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPlanPrice = (plan: SubscriptionPlan): string =>
  `${formatCurrency(plan.price, plan.currency)} / ${plan.billingCycle}`;

export const getDashboard = async (): Promise<DashboardResponse> => {
  const { data } = await apiClient.get<DashboardResponse>('/admin/dashboard');
  return data;
};

export const getAdminProfile = async (): Promise<AdminProfile> => {
  const { data } = await apiClient.get<AdminProfile>('/admin/profile');
  return data;
};

export const updateAdminProfile = async (payload: UpdateAdminProfilePayload): Promise<AdminProfile> => {
  const { data } = await apiClient.patch<{ profile: AdminProfile }>('/admin/profile', payload);
  return data.profile;
};

export const getBilling = async (): Promise<BillingResponse> => {
  const { data } = await apiClient.get<BillingResponse>('/admin/billing');
  return data;
};

export const getPayments = async (): Promise<PaymentRecord[]> => {
  const { data } = await apiClient.get<PaymentRecord[]>('/admin/billing/payments');
  return data;
};

export const getClinics = async (): Promise<ClinicListResponse> => {
  const { data } = await apiClient.get<ClinicListResponse>('/admin/clinics');
  return data;
};

export const createClinic = async (payload: CreateClinicPayload): Promise<Clinic> => {
  const { data } = await apiClient.post<{ clinic: Clinic }>('/admin/clinics', payload);
  return data.clinic;
};

export const deleteClinic = async (clinicId: string): Promise<void> => {
  await apiClient.delete(`/admin/clinics/${clinicId}`);
};

export const getClinicRequests = async (): Promise<ClinicRequest[]> => {
  const { data } = await apiClient.get<ClinicRequest[]>('/admin/clinics/requests');
  return data;
};

export const getRevenue = async (): Promise<RevenueResponse> => {
  const { data } = await apiClient.get<RevenueResponse>('/admin/revenue');
  return data;
};

export const getDoctorRequests = async (status?: DoctorApprovalStatus): Promise<DoctorRequest[]> => {
  const { data } = await apiClient.get<DoctorRequest[]>('/admin/doctors/requests', {
    params: status ? { status } : undefined,
  });
  return data;
};

export const approveDoctorRequest = async (doctorId: string): Promise<void> => {
  await apiClient.patch(`/admin/doctors/${doctorId}/approve`);
};

export const rejectDoctorRequest = async (doctorId: string): Promise<void> => {
  await apiClient.patch(`/admin/doctors/${doctorId}/reject`);
};

export const getSupportTickets = async (): Promise<SupportTicket[]> => {
  const { data } = await apiClient.get<SupportTicket[]>('/admin/support/tickets');
  return data;
};

export const getSupportTicketResponses = async (ticketId: string): Promise<SupportResponseLog[]> => {
  const { data } = await apiClient.get<SupportResponseLog[]>(`/admin/support/tickets/${ticketId}/responses`);
  return data;
};

export const respondToSupportTicket = async (
  ticketId: string,
  payload: { method: ResponseMethod; message: string; attachmentName?: string },
): Promise<SupportResponseLog> => {
  const { data } = await apiClient.post<{ response: SupportResponseLog }>(
    `/admin/support/tickets/${ticketId}/respond`,
    payload,
  );

  return data.response;
};
