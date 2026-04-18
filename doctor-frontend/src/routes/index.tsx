import { Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/DashboardPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<DashboardPage />} path="/" />
      <Route element={<DashboardPage />} path="/dashboard" />
      <Route element={<DashboardPage />} path="/doctor/dashboard" />
    </Routes>
  );
};

export { AppRouter };
