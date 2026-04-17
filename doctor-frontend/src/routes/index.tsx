import { Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/DashboardPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<DashboardPage />} path="/" />
    </Routes>
  );
};

export { AppRouter };
