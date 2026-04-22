import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DoctorSignupPage } from '@/pages/DoctorSignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { getAuthSession } from '@/services/auth-storage';

const PublicOnlyRoute = ({ children }: { children: ReactElement }) => {
  const session = getAuthSession();

  if (session) {
    return <Navigate replace to="/dashboard" />;
  }

  return children;
};

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const session = getAuthSession();

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Navigate replace to="/login" />} path="/" />
      <Route element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} path="/login" />
      <Route element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} path="/signup" />
      <Route element={<PublicOnlyRoute><DoctorSignupPage /></PublicOnlyRoute>} path="/doctor-signup" />
      <Route element={<ProtectedRoute><DashboardPage role="patient" /></ProtectedRoute>} path="/dashboard" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
