import axios from 'axios';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { PasswordField } from '@/components/PasswordField';
import { apiClient } from '@/services/api';
import { saveAuthSession, type AuthRole } from '@/services/auth-storage';
import {
  requestSignupOtp,
  verifySignupOtp,
} from '@/services/signup-otp';

type PatientSignupForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  isDoctor: boolean;
};

type SignupResponse = {
  token: string;
  role: AuthRole;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  message: string;
};

type ValidationDetail = {
  field: string;
  constraints?: Record<string, string>;
};

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin;
const adminAppUrl = import.meta.env.VITE_ADMIN_APP_URL ?? 'http://localhost:5174';
const doctorAppUrl = import.meta.env.VITE_DOCTOR_APP_URL ?? 'http://localhost:5175';

const buildRedirectUrl = (baseUrl: string, path: string, data: SignupResponse): string => {
  const params = new URLSearchParams({
    token: data.token,
    role: data.role,
    userId: data.userId,
  });

  return `${baseUrl.replace(/\/+$/, '')}${path}?${params.toString()}`;
};

const getRedirectUrl = (data: SignupResponse): string => {
  if (data.role === 'admin') {
    return buildRedirectUrl(adminAppUrl, '/admin/dashboard', data);
  }

  if (data.role === 'doctor') {
    return buildRedirectUrl(doctorAppUrl, '/doctor/dashboard', data);
  }

  return `${authAppUrl}/`;
};

const initialForm: PatientSignupForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  isDoctor: false,
};

const SignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<PatientSignupForm>(() => ({
    ...initialForm,
    email: location.state?.initialEmail || '',
  }));
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange =
    (field: keyof PatientSignupForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = field === 'isDoctor' ? event.target.checked : event.target.value;
      let nextValue = rawValue;

      if (field === 'name' && typeof rawValue === 'string') {
        nextValue = rawValue.replace(/[^A-Za-z ]/g, '');
      }

      if (field === 'phone' && typeof rawValue === 'string') {
        nextValue = rawValue.replace(/\D/g, '').slice(0, 10);
      }

      setForm((current) => ({ ...current, [field]: nextValue }));
      setOtp('');
      setOtpRequested(false);
      setSuccessMessage('');
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        delete nextErrors.form;
        delete nextErrors.otp;
        return nextErrors;
      });
    };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone is required.';
    } else if (form.phone.trim().length !== 10) {
      nextErrors.phone = 'Phone number must be 10 digits.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSuccessMessage('');

    try {
      if (!otpRequested) {
        setIsRequestingOtp(true);
        const result = await requestSignupOtp({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.isDoctor ? 'doctor' : 'patient',
        });

        setOtpRequested(true);
        setSuccessMessage(
          `${result.message}. Enter the OTP below to ${form.isDoctor ? 'continue to doctor details' : 'finish signup'}.`,
        );
        return;
      }

      if (!otp.trim()) {
        setErrors({ otp: 'Enter the OTP sent to your email.' });
        return;
      }

      setIsVerifyingOtp(true);
      const verification = await verifySignupOtp({
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.isDoctor ? 'doctor' : 'patient',
        otp: otp.trim(),
      });

      if (form.isDoctor) {
        setSuccessMessage('OTP verified successfully. Continue with doctor details.');
        navigate('/doctor-signup', {
          state: {
            basicDetails: {
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              password: form.password,
              confirmPassword: form.confirmPassword,
              signupVerificationToken: verification.signupVerificationToken,
            },
          },
        });
        return;
      }

      setIsSubmitting(true);
      const { data } = await apiClient.post<SignupResponse>('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: 'patient',
        signupVerificationToken: verification.signupVerificationToken,
      });

      saveAuthSession(data);
      window.localStorage.setItem('careloop.signup.phone', form.phone.trim());
      window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
      window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
      setSuccessMessage('OTP verified, welcome message sent, and account created successfully. Redirecting...');
      window.setTimeout(() => {
        window.location.assign(getRedirectUrl(data));
      }, 700);
    } catch (error) {
      if (axios.isAxiosError<{ message?: string; details?: ValidationDetail[] }>(error)) {
        const response = error.response?.data;
        const details = response?.details;

        if (Array.isArray(details) && details.length > 0) {
          const nextErrors: Record<string, string> = {};
          details.forEach((detail) => {
            const firstConstraint = detail.constraints ? Object.values(detail.constraints)[0] : '';
            if (detail.field && firstConstraint && !nextErrors[detail.field]) {
              nextErrors[detail.field] = firstConstraint;
            }
          });

          if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
          }
        }

        setErrors({ form: response?.message ?? 'OTP verification failed. Please try again.' });
        return;
      }

      setErrors({ form: 'OTP verification failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setIsRequestingOtp(false);
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSuccessMessage('');
    setIsRequestingOtp(true);

    try {
      const result = await requestSignupOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.isDoctor ? 'doctor' : 'patient',
      });

      setOtpRequested(true);
      setSuccessMessage(`${result.message}.`);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Unable to resend OTP right now.'
        : 'Unable to resend OTP right now.';

      setErrors({ form: message });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-8">
      <section className="w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white p-4 shadow-xl sm:max-w-3xl sm:rounded-[32px] sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Care Loop</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Create your account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Patients can sign up directly. Doctors continue to the next step for professional details.
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-semibold text-[#15803D]" to="/login">
              Login
            </Link>
          </p>
        </div>

        <form className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
          <InputField label="Full Name" onChange={handleInputChange('name')} value={form.name} />
          <InputField label="Email" onChange={handleInputChange('email')} type="email" value={form.email} />
          <InputField
            label="Phone Number"
            maxLength={10}
            onChange={handleInputChange('phone')}
            type="tel"
            value={form.phone}
          />
          <div>
            <PasswordField
              label="Password"
              name="password"
              onChange={handleInputChange('password')}
              placeholder="Create a password"
              value={form.password}
            />
            {errors.password ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.password}</p> : null}
          </div>
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              onChange={handleInputChange('confirmPassword')}
              placeholder="Confirm your password"
              value={form.confirmPassword}
            />
            {errors.confirmPassword ? (
              <p className="mt-2 text-xs font-medium text-rose-500">{errors.confirmPassword}</p>
            ) : null}
          </div>

          {['name', 'email', 'phone'].map((field) =>
            errors[field] ? (
              <p className="text-xs font-medium text-rose-500 sm:col-span-2" key={field}>
                {errors[field]}
              </p>
            ) : null,
          )}

          <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
            <input
              checked={form.isDoctor}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A]"
              onChange={handleInputChange('isDoctor')}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Are you a doctor?</span>
              <span className="mt-1 block text-sm text-slate-600">
                Select this to continue to the doctor-details step and submit your profile for admin review.
              </span>
            </span>
          </label>

          {otpRequested ? (
            <>
              <InputField
                error={errors.otp}
                hint="Check your email inbox for the verification code."
                label="OTP"
                maxLength={6}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setErrors((current) => {
                    const nextErrors = { ...current };
                    delete nextErrors.otp;
                    delete nextErrors.form;
                    return nextErrors;
                  });
                }}
                placeholder="Enter 6-digit OTP"
                value={otp}
                wrapperClassName="sm:col-span-2"
              />
              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  OTP is required for both doctor and patient signup before the account is created.
                </p>
                <Button
                  className="rounded-2xl px-5"
                  disabled={isRequestingOtp || isSubmitting || isVerifyingOtp}
                  onClick={() => void handleResendOtp()}
                  type="button"
                  variant="secondary"
                >
                  {isRequestingOtp ? 'Sending...' : 'Resend OTP'}
                </Button>
              </div>
            </>
          ) : null}

          {errors.form ? <p className="text-xs font-medium text-rose-500 sm:col-span-2">{errors.form}</p> : null}
          {successMessage ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
              {successMessage}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              className="rounded-2xl px-6"
              disabled={isSubmitting || isRequestingOtp || isVerifyingOtp}
              type="submit"
            >
              {!otpRequested
                ? isRequestingOtp
                  ? 'Sending OTP...'
                  : 'Send OTP'
                : form.isDoctor
                  ? isVerifyingOtp
                    ? 'Verifying...'
                    : 'Verify OTP & Continue'
                  : isSubmitting || isVerifyingOtp
                    ? 'Creating...'
                    : 'Verify OTP & Create account'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export { SignupPage };
