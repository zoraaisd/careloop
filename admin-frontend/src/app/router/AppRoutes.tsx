import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@/components/common/AuthGuard';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { Billing } from '@/pages/billing/BillingPage';
import { ClinicSubscriptions } from '@/pages/billing/ClinicSubscriptionsPage';
import { AddClinic } from '@/pages/clinics/AddClinicPage';
import { ClinicRequests } from '@/pages/clinics/ClinicRequestsPage';
import { Clinics } from '@/pages/clinics/AllClinicsPage';
import { Dashboard } from '@/pages/dashboard/DashboardPage';
import { DoctorDetails } from '@/pages/doctors/DoctorDetailsPage';
import { DoctorRequests } from '@/pages/doctors/DoctorRequestsPage';
import { Doctors } from '@/pages/doctors/DoctorsPage';
import PaymentCheckoutPage from '@/pages/doctors/PaymentCheckoutPage';
import { LogsSecurity } from '@/pages/logs-security/LogsSecurityPage';
import { Profile } from '@/pages/profile/ProfilePage';
import { Revenue } from '@/pages/revenue/RevenuePage';
import { Support } from '@/pages/support/SupportPage';
import { AllUsers } from '@/pages/users/AllUsersPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Navigate replace to="/admin/login" />} path="/" />
      <Route element={<AdminLoginPage />} path="/admin/login" />
      
      <Route element={<AuthGuard><AdminLayout /></AuthGuard>} path="/admin">
        <Route element={<Navigate replace to="/admin/dashboard" />} index />
        <Route element={<Dashboard />} path="dashboard" />
        <Route element={<Navigate replace to="/admin/users/all" />} path="users" />
        <Route element={<AllUsers filter="all" />} path="users/all" />
        <Route element={<AllUsers filter="active" />} path="users/active" />
        <Route element={<AllUsers filter="trial" />} path="users/trial" />
        <Route element={<AllUsers filter="expired" />} path="users/expired" />
        <Route element={<Profile />} path="profile" />
        <Route element={<Doctors />} path="doctors" />
        <Route element={<DoctorDetails />} path="doctors/:doctorId" />
        <Route element={<PaymentCheckoutPage />} path="doctors/:doctorId/checkout" />
        <Route element={<Navigate replace to="/admin/billing/subscription-plans" />} path="billing" />
        <Route element={<Billing />} path="billing/subscription-plans" />
        <Route element={<ClinicSubscriptions />} path="billing/clinic-subscriptions" />
        <Route element={<Navigate replace to="/admin/clinics/all" />} path="clinics" />
        <Route element={<Clinics />} path="clinics/all" />
        <Route element={<AddClinic />} path="clinics/add" />
        <Route element={<ClinicRequests />} path="clinics/requests" />
        <Route element={<DoctorRequests />} path="doctors/requests" />
        <Route element={<Revenue />} path="revenue" />
        <Route element={<Support />} path="support" />
        <Route element={<LogsSecurity />} path="logs-security" />
      </Route>

      <Route element={<Navigate replace to="/admin/login" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
