import axios from 'axios';
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '@/services/api';
import { saveAuthSession } from '@/services/auth-storage';

type LoginResponse = {
  token: string;
  role: 'admin' | 'doctor' | 'patient';
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  subscriptionStatus?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  accessState?: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal?: boolean;
  canAppearPublicly?: boolean;
  message?: string;
};

const DoctorLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data } = await api.post<LoginResponse>('/doctor/auth/login', {
        email: email.trim(),
        password,
      });

      if (data.role !== 'doctor') {
        setErrorMessage('Access denied. This portal is for doctors only.');
        setIsSubmitting(false);
        return;
      }

      saveAuthSession({
        token: data.token,
        role: 'doctor',
        userId: data.userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        mustChangePassword: data.mustChangePassword,
        approvalStatus: data.approvalStatus,
        accessState: data.accessState,
        canAccessPortal: data.canAccessPortal,
        message: data.message,
        temporaryPassword: data.mustChangePassword ? password : undefined,
      });

      navigate(data.mustChangePassword ? '/force-password-change' : '/dashboard', { replace: true });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Login failed. Please try again.'
        : 'Login failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5faf7] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#dce9e2] bg-white p-6 shadow-[0_18px_55px_rgba(20,56,46,0.08)] sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#173229]">Clinic Portal</h1>
          <p className="mt-2 text-sm text-[#6e887f]">Sign in to access your clinic dashboard</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#173229]">Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-[#d7e2dc] px-4 py-3 text-sm text-[#173229] outline-none transition focus:border-[#1aa65f]"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your invited doctor email"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#173229]">Password</span>
            <div className="relative">
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[#d7e2dc] px-4 py-3 pr-12 text-sm text-[#173229] outline-none transition focus:border-[#1aa65f]"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#6e887f] transition hover:text-[#173229]"
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#dc2626]">
              {errorMessage}
            </div>
          ) : null}

          <button
            className="w-full cursor-pointer rounded-2xl bg-[#1aa65f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#189356] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In to Clinic Portal'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default DoctorLoginPage;
