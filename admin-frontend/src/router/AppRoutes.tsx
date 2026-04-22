import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AddClinic } from '@/pages/AddClinic';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AllClinics } from '@/pages/AllClinics';
import { Billing } from '@/pages/Billing';
import { ClinicRequests } from '@/pages/ClinicRequests';
import { ClinicSubscriptions } from '@/pages/ClinicSubscriptions';
import { Dashboard } from '@/pages/Dashboard';
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

      <Route element={<AdminLayout />} path="/admin">
        <Route element={<Navigate replace to="/admin/dashboard" />} index />
        <Route element={<Dashboard />} path="dashboard" />
        <Route element={<Profile />} path="profile" />
        <Route element={<Navigate replace to="/admin/billing/subscription-plans" />} path="billing" />
        <Route element={<Billing />} path="billing/subscription-plans" />
        <Route element={<ClinicSubscriptions />} path="billing/clinic-subscriptions" />
        <Route element={<Navigate replace to="/admin/clinics/all" />} path="clinics" />
        <Route element={<AllClinics />} path="clinics/all" />
        <Route element={<AddClinic />} path="clinics/add" />
        <Route element={<ClinicRequests />} path="clinics/requests" />
        <Route element={<Revenue />} path="revenue" />
        <Route element={<Support />} path="support" />
      </Route>

      <Route element={<RedirectToAuthLogin />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
