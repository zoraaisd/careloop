import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Mail, Key, ShieldCheck } from 'lucide-react';
import api from '@/services/api';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.post('/doctor/auth/forgot-password', { email: email.trim() });
      setStep('reset');
      setSuccessMessage('OTP has been sent to your email.');
    } catch (error) {
      setErrorMessage(
        axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message ?? 'Failed to send OTP. Please try again.'
          : 'Failed to send OTP. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.post('/doctor/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      setSuccessMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setErrorMessage(
        axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message ?? 'Failed to reset password. Please try again.'
          : 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-[#d7e2dc] px-4 py-3 text-sm text-[#173229] outline-none transition focus:border-[#1aa65f]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5faf7] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#dce9e2] bg-white p-6 shadow-[0_18px_55px_rgba(20,56,46,0.08)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            {step === 'request' ? <Mail className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold text-[#173229]">
            {step === 'request' ? 'Forgot Password?' : 'Reset Password'}
          </h1>
          <p className="mt-2 text-sm text-[#6e887f]">
            {step === 'request' 
              ? "No worries, we'll send you reset instructions."
              : `Enter the code sent to ${email} and your new password.`}
          </p>
        </div>

        {step === 'request' ? (
          <form className="mt-8 space-y-5" onSubmit={handleRequestOtp}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#173229]">Email</span>
              <input
                className={inputClass}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                value={email}
              />
            </label>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">
                {errorMessage}
              </div>
            )}

            <button
              className="w-full rounded-2xl bg-[#1aa65f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#189356] disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
             <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#173229]">Verification Code</span>
              <div className="relative">
                <input
                  className={inputClass}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  type="text"
                  value={otp}
                />
                <Key className="absolute right-4 top-3.5 h-4 w-4 text-[#6e887f]" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#173229]">New Password</span>
              <div className="relative">
                <input
                  className={inputClass}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={newPassword}
                />
                <button
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#6e887f] transition hover:text-[#173229]"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  type="button"
                >
                  {isPasswordVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#173229]">Confirm New Password</span>
              <input
                className={inputClass}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                type="password"
                value={confirmPassword}
              />
            </label>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">
                {errorMessage}
              </div>
            )}

            <button
              className="w-full rounded-2xl bg-[#1aa65f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#189356] disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <button
              className="w-full text-center text-xs font-semibold text-[#6e887f] hover:text-[#1aa65f]"
              onClick={() => setStep('request')}
              type="button"
            >
              Didn't receive code? Resend OTP
            </button>
          </form>
        )}

        {successMessage && !errorMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-600">
            {successMessage}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e887f] transition hover:text-[#1aa65f]"
            to="/login"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
