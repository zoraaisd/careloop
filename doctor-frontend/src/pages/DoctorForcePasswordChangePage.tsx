import axios from 'axios';
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '@/services/api';
import { clearAuthSession, getAuthSession, saveAuthSession } from '@/services/auth-storage';

type ChangePasswordResponse = {
  token: string;
  role: 'admin' | 'doctor' | 'patient';
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  accessState?: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal?: boolean;
  message?: string;
};

const DoctorForcePasswordChangePage: React.FC = () => {
  const navigate = useNavigate();
  const session = React.useMemo(() => getAuthSession(), []);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = React.useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('New password and confirm password are required.');
      return;
    }

    if (newPassword.trim().length < 8) {
      setErrorMessage('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password must match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let data: ChangePasswordResponse;

      try {
        const response = await api.post<ChangePasswordResponse>('/doctor/auth/change-password', {
          newPassword,
          confirmPassword,
        });
        data = response.data;
      } catch (error) {
        const routeMissing =
          axios.isAxiosError<{ message?: string }>(error) &&
          error.response?.status === 404 &&
          error.response?.data?.message === 'Route not found';

        if (!routeMissing) {
          const hasStoredTemporaryPassword = Boolean(session?.email && session?.temporaryPassword);
          if (!hasStoredTemporaryPassword) {
            throw error;
          }
        }

        try {
          const fallbackResponse = await api.post<ChangePasswordResponse>('/doctor/change-password', {
            newPassword,
            confirmPassword,
          });
          data = fallbackResponse.data;
        } catch (fallbackError) {
          const hasStoredTemporaryPassword = Boolean(session?.email && session?.temporaryPassword);

          if (!hasStoredTemporaryPassword) {
            throw fallbackError;
          }

          const completeFirstLoginResponse = await api.post<ChangePasswordResponse>(
            '/doctor/auth/complete-first-login',
            {
              email: session?.email,
              temporaryPassword: session?.temporaryPassword,
              newPassword,
              confirmPassword,
            },
          );
          data = completeFirstLoginResponse.data;
        }
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
        temporaryPassword: undefined,
      });

      navigate('/dashboard', { replace: true });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError<{ message?: string; debug?: { message?: string } }>(error)
        ? error.response?.data?.message ??
          error.response?.data?.debug?.message ??
          error.message ??
          'Unable to update password. Please try again.'
        : 'Unable to update password. Please try again.';

      if (status === 401) {
        clearAuthSession();
        navigate('/login', { replace: true });
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5faf7] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#dce9e2] bg-white p-6 shadow-[0_18px_55px_rgba(20,56,46,0.08)] sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#173229]">Set Your New Password</h1>
          <p className="mt-2 text-sm text-[#6e887f]">
            Continue with the temporary password once, then create a secure password to enter the doctor portal.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#173229]">New Password</span>
            <div className="relative">
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[#d7e2dc] px-4 py-3 pr-12 text-sm text-[#173229] outline-none transition focus:border-[#1aa65f]"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter a new password"
                type={isNewPasswordVisible ? 'text' : 'password'}
                value={newPassword}
              />
              <button
                aria-label={isNewPasswordVisible ? 'Hide new password' : 'Show new password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#6e887f] transition hover:text-[#173229]"
                onClick={() => setIsNewPasswordVisible((current) => !current)}
                type="button"
              >
                {isNewPasswordVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#173229]">Confirm Password</span>
            <div className="relative">
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[#d7e2dc] px-4 py-3 pr-12 text-sm text-[#173229] outline-none transition focus:border-[#1aa65f]"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                value={confirmPassword}
              />
              <button
                aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#6e887f] transition hover:text-[#173229]"
                onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                type="button"
              >
                {isConfirmPasswordVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
            {isSubmitting ? 'Updating password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default DoctorForcePasswordChangePage;
