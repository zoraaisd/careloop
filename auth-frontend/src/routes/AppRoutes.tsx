import { Route, Routes } from 'react-router-dom';

import { DoctorSignupPage } from '@/pages/DoctorSignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<SignupPage />} path="/signup" />
      <Route element={<DoctorSignupPage />} path="/doctor-signup" />
      <Route element={<DashboardPage role="patient" />} path="/dashboard" />
    </Routes>
  );
};

export { AppRoutes };
