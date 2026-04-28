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
    description: 'Perfect for small clinics',
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

export const clinicSeed: AdminClinic[] = [
  {
    id: 'clinic-kj',
    clinicName: 'KJ Clinic',
    ownerName: 'Dr. Karan J.',
    address: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    contact: '+91 99887 76655',
    email: 'karan@kjclinic.com',
    subscriptionPlan: 'Pro',
    doctors: 4,
    patients: 1250,
    status: 'Active',
    createdAt: formatDate(thirtyDaysAgo),
  },
  {
    id: 'clinic-xy',
    clinicName: 'XY Multispecialty',
    ownerName: 'Dr. Xavier Y.',
    address: 'Koramangala, Bengaluru',
    city: 'Bengaluru',
    contact: '+91 88776 65544',
    email: 'xavier@xyhealth.com',
    subscriptionPlan: 'Starter',
    doctors: 2,
    patients: 450,
    status: 'Active',
    createdAt: formatDate(thirtyDaysAgo),
  }
];

export const clinicRequestSeed: ClinicRequest[] = [
  {
    id: 'req-1',
    clinic: 'City Wellness Center',
    city: 'Mumbai',
    owner: 'Dr. Rahul S.',
    requestedOn: formatDate(new Date()),
    status: 'Pending',
    contact: '+91 77665 54433',
  }
];

export const paymentSeed: ClinicSubscriptionPayment[] = [
  {
    id: 'pay-1',
    clinicId: 'clinic-kj',
    clinicName: 'KJ Clinic',
    planId: 'plan-pro',
    planName: 'Pro Plan',
    amount: 4999,
    currency: 'INR',
    paidOn: formatDate(new Date()),
    status: 'Paid',
  },
  {
    id: 'pay-2',
    clinicId: 'clinic-xy',
    clinicName: 'XY Multispecialty',
    planId: 'plan-starter',
    planName: 'Starter Plan',
    amount: 1999,
    currency: 'INR',
    paidOn: formatDate(new Date()),
    status: 'Paid',
  }
];

export const clinicSubscriptionSeed: ClinicSubscriptionRecord[] = [
  {
    id: 'sub-1',
    clinicId: 'clinic-kj',
    clinicName: 'KJ Clinic',
    planId: 'plan-pro',
    planName: 'Pro Plan',
    status: 'Active',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    amount: 4999,
    currency: 'INR',
  },
  {
    id: 'sub-2',
    clinicId: 'clinic-xy',
    clinicName: 'XY Multispecialty',
    planId: 'plan-starter',
    planName: 'Starter Plan',
    status: 'Active',
    startDate: '2026-04-05',
    endDate: '2026-05-05',
    amount: 1999,
    currency: 'INR',
  }
];

export const supportTicketSeed: SupportTicket[] = [];

export const supportResponseSeed: SupportTicketResponseLog[] = [];

export const dashboardSummaryData: AdminDashboardSummary = {
  totalDoctors: 125,
  pendingDoctorRequests: 4,
  pendingClinicRequests: 4,
  totalPatients: 15420,
  activeSubscriptions: 12,
  revenueStatistics: 'Rs 1,45,000',
  whatsappMessagesSent: 8540,
  totalClinics: 15,
};

export const dashboardSeed: AdminDashboardResponse = {
  summary: {
    totalDoctors: 45,
    pendingDoctorRequests: 3,
    pendingClinicRequests: 4,
    totalPatients: 2840,
    activeSubscriptions: 12,
    revenueStatistics: 'Rs 1,45,000',
    whatsappMessagesSent: 8540,
    totalClinics: 15,
  },
  recentClinics: [
    {
      id: 'clinic-kj',
      clinicName: 'KJ Clinic',
      ownerName: 'Dr. Karan J.',
      city: 'Bengaluru',
      status: 'Active',
      createdAt: formatDate(thirtyDaysAgo),
    },
    {
      id: 'clinic-xy',
      clinicName: 'XY Multispecialty',
      ownerName: 'Dr. Xavier Y.',
      city: 'Bengaluru',
      status: 'Active',
      createdAt: formatDate(thirtyDaysAgo),
    }
  ],
  charts: {
    systemActivity: [
      { label: 'Mon', logins: 120, tasks: 45 },
      { label: 'Tue', logins: 150, tasks: 60 },
      { label: 'Wed', logins: 180, tasks: 55 },
      { label: 'Thu', logins: 165, tasks: 70 },
      { label: 'Fri', logins: 190, tasks: 85 },
      { label: 'Sat', logins: 90, tasks: 30 },
      { label: 'Sun', logins: 40, tasks: 15 },
    ],
    newClinicRegistrations: [
      { label: 'Jan', clinics: 2 },
      { label: 'Feb', clinics: 5 },
      { label: 'Mar', clinics: 8 },
      { label: 'Apr', clinics: 12 },
      { label: 'May', clinics: 0 },
      { label: 'Jun', clinics: 0 },
    ],
  },
};

export const revenueSeed: RevenueStatisticsResponse = {
  overview: {
    monthlyRevenue: 'Rs 1,45,000',
    yearlyRevenue: 'Rs 12,50,000',
    subscriptionGrowth: '+15%',
    clinicRevenueDistribution: 'Diversified',
  },
  revenueTrend: [
    { month: 'Jan', monthly: 85000, yearly: 85000 },
    { month: 'Feb', monthly: 95000, yearly: 180000 },
    { month: 'Mar', monthly: 110000, yearly: 290000 },
    { month: 'Apr', monthly: 145000, yearly: 435000 },
    { month: 'May', monthly: 0, yearly: 435000 },
    { month: 'Jun', monthly: 0, yearly: 435000 },
  ],
  clinicRevenueDistribution: [
    { name: 'Pro Plan', value: 65 },
    { name: 'Starter Plan', value: 25 },
    { name: 'Enterprise', value: 10 },
  ],
};
