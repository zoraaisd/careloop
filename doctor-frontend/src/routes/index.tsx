import { Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/DashboardPage';

import { AuthGuard } from '@/components/AuthGuard';

const AppRouter = () => {
  return (
    <AuthGuard>
      <Routes>
        <Route element={<DashboardPage />} path="/" />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<DashboardPage />} path="/doctor/dashboard" />
      </Routes>
    </AuthGuard>
  );
};

export { AppRouter };
