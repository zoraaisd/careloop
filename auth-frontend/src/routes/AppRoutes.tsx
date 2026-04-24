import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DoctorSignupPage } from '@/pages/DoctorSignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { getAuthSession } from '@/services/auth-storage';

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
      <Route element={<LandingPage />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<SignupPage />} path="/signup" />
      <Route element={<DoctorSignupPage />} path="/doctor-signup" />
      <Route element={<ProtectedRoute><DashboardPage role="patient" /></ProtectedRoute>} path="/dashboard" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
