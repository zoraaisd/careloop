import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { BookAppointmentPage } from '@/pages/BookAppointmentPage';
import { DoctorCouncilVerificationPage } from '@/pages/DoctorCouncilVerificationPage';
import { DoctorSignupPage } from '@/pages/DoctorSignupPage';
import { DoctorProfilePage } from '@/pages/DoctorProfilePage';
import { DoctorReviewPage } from '@/pages/DoctorReviewPage';
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
      <Route element={<DoctorCouncilVerificationPage />} path="/doctor-signup/council-verification" />
      <Route element={<DoctorProfilePage />} path="/doctor/:id" />
      <Route element={<DoctorProfilePage />} path="/doctors/:id" />
      <Route element={<DoctorReviewPage />} path="/doctor/:id/review" />
      <Route element={<DoctorReviewPage />} path="/doctors/:id/review" />
      <Route element={<BookAppointmentPage />} path="/doctors/:doctorId/book" />
      <Route element={<ProtectedRoute><DashboardPage role="patient" /></ProtectedRoute>} path="/dashboard" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
