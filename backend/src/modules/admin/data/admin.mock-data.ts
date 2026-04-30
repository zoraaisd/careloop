import type {
  AdminClinic,
  AdminDashboardResponse,
  AdminDashboardSummary,
  AdminProfile,
  ClinicRequest,
  ClinicSubscriptionPayment,
  ClinicSubscriptionRecord,
  RevenueStatisticsResponse,
  SubscriptionPlan,
  SupportTicket,
  SupportTicketResponseLog,
} from '../types/admin.types';

const now = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const thirtyDaysFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

export const adminProfileSeed: AdminProfile = {
  id: 'admin-1',
  adminName: 'Aditi Nair',
  email: 'aditi@careloop.com',
  phoneNumber: '+91 98765 43210',
  role: 'Super Admin',
  organizationName: 'CareLoop Health Services',
  location: 'MG Road, Bengaluru, Karnataka 560001',
  accountCreatedDate: '2024-01-15',
  profileImageUrl: null,
};

export const subscriptionPlanSeed: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    description: 'Perfect for solo practitioners & small clinics',
    price: 1999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 2,
    patientsLimit: 500,
    whatsappLimit: 1000,
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
  }
];

export const clinicSeed: AdminClinic[] = [];

export const clinicRequestSeed: ClinicRequest[] = [];

export const paymentSeed: ClinicSubscriptionPayment[] = [];

export const clinicSubscriptionSeed: ClinicSubscriptionRecord[] = [];

export const supportTicketSeed: SupportTicket[] = [];

export const supportResponseSeed: SupportTicketResponseLog[] = [];

export const dashboardSummaryData: AdminDashboardSummary = {
  totalDoctors: 0,
  pendingDoctorRequests: 0,
  pendingClinicRequests: 0,
  trialUsers: 0,
  activeSubscriptions: 0,
  revenueStatistics: 'Rs 0',
  whatsappMessagesSent: 0,
  totalClinics: 0,
};

export const dashboardSeed: AdminDashboardResponse = {
  summary: {
    totalDoctors: 0,
    pendingDoctorRequests: 0,
    pendingClinicRequests: 0,
    trialUsers: 0,
    activeSubscriptions: 0,
    revenueStatistics: 'Rs 0',
    whatsappMessagesSent: 0,
    totalClinics: 0,
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
    newClinicRegistrations: [
      { label: 'Jan', clinics: 0 },
      { label: 'Feb', clinics: 0 },
      { label: 'Mar', clinics: 0 },
      { label: 'Apr', clinics: 0 },
      { label: 'May', clinics: 0 },
      { label: 'Jun', clinics: 0 },
    ],
  },
};

export const revenueSeed: RevenueStatisticsResponse = {
  overview: {
    monthlyRevenue: 'Rs 0',
    yearlyRevenue: 'Rs 0',
    subscriptionGrowth: '0%',
    clinicRevenueDistribution: 'No subscriptions yet',
  },
  revenueTrend: [],
  clinicRevenueDistribution: [],
};
