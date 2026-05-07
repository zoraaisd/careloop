import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { DoctorProfilePage } from '@/pages/doctors/DoctorProfilePage';
import { DoctorReviewPage } from '@/pages/doctors/DoctorReviewPage';
import { LandingPage } from '@/pages/home/LandingPage';
import { DoctorCouncilVerificationPage } from '@/pages/onboarding/DoctorCouncilVerificationPage';
import { DoctorSignupPage } from '@/pages/onboarding/DoctorSignupPage';
import { BookAppointmentPage } from '@/pages/patient/BookAppointmentPage';
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
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
};

export { AppRoutes };
