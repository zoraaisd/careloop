import { Route, Routes } from 'react-router-dom';

import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<SignupPage />} path="/signup" />
    </Routes>
  );
};

export { AppRouter };
