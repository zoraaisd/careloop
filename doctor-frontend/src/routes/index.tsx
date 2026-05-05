import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/DashboardPage';
import AddDoctorPage from '@/pages/AddDoctorPage';

import { AuthGuard } from '@/components/AuthGuard';

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

const RedirectToAuthLogin = () => {
  useEffect(() => {
    window.location.replace(`${AUTH_APP_URL}/login`);
  }, []);

  return null;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<RedirectToAuthLogin />} path="/login" />
      <Route element={<RedirectToAuthLogin />} path="/logout" />
      <Route
        element={(
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        )}
        path="/"
      />
      <Route
        element={(
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        )}
        path="/dashboard"
      />
      <Route
        element={(
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        )}
        path="/doctor/dashboard"
      />
      <Route
        element={(
          <AuthGuard>
            <AddDoctorPage />
          </AuthGuard>
        )}
        path="/add-doctor"
      />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
};

export { AppRouter };
