import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Billing } from '@/pages/Billing';
import { Clinics } from '@/pages/Clinics';
import { Dashboard } from '@/pages/Dashboard';
import { Profile } from '@/pages/Profile';
import { Revenue } from '@/pages/Revenue';
import { Support } from '@/pages/Support';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Navigate replace to="/admin/dashboard" />} path="/" />

      <Route element={<AdminLayout />} path="/admin">
        <Route element={<Navigate replace to="/admin/dashboard" />} index />
        <Route element={<Dashboard />} path="dashboard" />
        <Route element={<Profile />} path="profile" />
        <Route element={<Billing />} path="billing" />
        <Route element={<Clinics />} path="clinics" />
        <Route element={<Revenue />} path="revenue" />
        <Route element={<Support />} path="support" />
      </Route>

      <Route element={<Navigate replace to="/admin/dashboard" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
