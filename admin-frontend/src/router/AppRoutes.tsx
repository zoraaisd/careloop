import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@/components/AuthGuard';
import { AddClinic } from '@/pages/AddClinic';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AllClinics } from '@/pages/AllClinics';
import { AllUsers } from '@/pages/AllUsers';
import { Billing } from '@/pages/Billing';
import { ClinicRequests } from '@/pages/ClinicRequests';
import { ClinicSubscriptions } from '@/pages/ClinicSubscriptions';
import { Dashboard } from '@/pages/Dashboard';
import { DoctorDetails } from '@/pages/DoctorDetails';
import { Doctors } from '@/pages/Doctors';
import { DoctorRequests } from '@/pages/DoctorRequests';
import { LogsSecurity } from '@/pages/LogsSecurity';
import { Profile } from '@/pages/Profile';
import { Revenue } from '@/pages/Revenue';
import { Support } from '@/pages/Support';

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

const RedirectToAuthLogin = () => {
  useEffect(() => {
    window.location.replace(`${authAppUrl}/login`);
  }, []);

  return null;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<RedirectToAuthLogin />} path="/" />

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
        <Route element={<Navigate replace to="/admin/billing/subscription-plans" />} path="billing" />
        <Route element={<Billing />} path="billing/subscription-plans" />
        <Route element={<ClinicSubscriptions />} path="billing/clinic-subscriptions" />
        <Route element={<Navigate replace to="/admin/clinics/all" />} path="clinics" />
        <Route element={<AllClinics />} path="clinics/all" />
        <Route element={<AddClinic />} path="clinics/add" />
        <Route element={<ClinicRequests />} path="clinics/requests" />
        <Route element={<DoctorRequests />} path="doctors/requests" />
        <Route element={<Revenue />} path="revenue" />
        <Route element={<Support />} path="support" />
        <Route element={<LogsSecurity />} path="logs-security" />
      </Route>

      <Route element={<RedirectToAuthLogin />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
