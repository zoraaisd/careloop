import axios from 'axios';
import { useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { PasswordField } from '@/components/PasswordField';
import { apiClient } from '@/services/api';
import {
  saveAuthSession,
  type AuthRole,
} from '@/services/auth-storage';

type AuthMode = 'login' | 'signup';
type SignupRole = 'user' | 'doctor';

type AuthFormProps = {
  mode: AuthMode;
  role?: SignupRole;
};

type LoginFormState = {
  email: string;
  password: string;
};

type SignupFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type LoginField = keyof LoginFormState;
type SignupField = keyof SignupFormState;

type LoginResponse = {
  token: string;
  role: AuthRole;
  userId: string;
  name?: string;
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Za-z ]+$/;
const phonePattern = /^\d{10}$/;

const baseInputClassName = 'rounded-xl';
const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin;
const adminAppUrl = import.meta.env.VITE_ADMIN_APP_URL ?? 'http://localhost:5174';
const doctorAppUrl =
  import.meta.env.VITE_DOCTOR_APP_URL ?? 'http://localhost:5175';

const buildRedirectUrl = (baseUrl: string, path: string, data: LoginResponse): string => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const params = new URLSearchParams({
    token: data.token,
    role: data.role,
    userId: data.userId,
  });

  return `${normalizedBaseUrl}${normalizedPath}?${params.toString()}`;
};

const getRedirectUrl = (data: LoginResponse): string => {
  if (data.role === 'admin') {
    return buildRedirectUrl(adminAppUrl, '/admin/dashboard', data);
  }

  if (data.role === 'doctor') {
    return buildRedirectUrl(doctorAppUrl, '/doctor/dashboard', data);
  }

  return `${authAppUrl}/dashboard`;
};

const AuthForm = ({ mode, role = 'user' }: AuthFormProps) => {
  const isSignup = mode === 'signup';
  const isLogin = mode === 'login';

  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: '',
    password: '',
  });

  const [signupForm, setSignupForm] = useState<SignupFormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => {
    if (mode === 'login') {
      return 'Login';
    }

    return role === 'doctor' ? 'Doctor Sign Up' : 'Create Account';
  }, [mode, role]);

  const subtitle = useMemo(() => {
    if (mode === 'login') {
      return 'Sign in with your email and password.';
    }

    return role === 'doctor'
      ? 'Register as a doctor to continue to your dedicated portal.'
      : 'Create your account to access Care Loop.';
  }, [mode, role]);

  const validateLogin = (values: LoginFormState) => {
    const nextErrors: Partial<Record<LoginField, string>> = {};

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!values.password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    return nextErrors;
  };

  const validateSignup = (values: SignupFormState) => {
    const nextErrors: Partial<Record<SignupField, string>> = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Name is required.';
    } else if (!namePattern.test(values.name.trim())) {
      nextErrors.name = 'Name can only contain letters and spaces.';
    }

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!values.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!phonePattern.test(values.phone.trim())) {
      nextErrors.phone = 'Phone number must be exactly 10 digits.';
    }

    if (!values.password.trim()) {
      nextErrors.password = 'Create Password is required.';
    }

    if (!values.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm Password is required.';
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleLoginInput = (field: LoginField) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

      setLoginForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        delete nextErrors.form;
        return nextErrors;
      });
  };

  const handleSignupInput =
    (field: SignupField) => (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      let value = rawValue;

      if (field === 'name') {
        value = rawValue.replace(/[^A-Za-z ]/g, '');
      }

      if (field === 'phone') {
        value = rawValue.replace(/\D/g, '').slice(0, 10);
      }

      setSignupForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        const nextErrors = { ...current };
        if (field === 'name' && rawValue !== value) {
          nextErrors.name = 'Name can only contain letters and spaces.';
        } else if (field === 'phone' && rawValue !== value) {
          nextErrors.phone = 'Phone number can only contain digits.';
        } else {
          delete nextErrors[field];
        }

        if (field === 'password' || field === 'confirmPassword') {
          delete nextErrors.confirmPassword;
        }

        delete nextErrors.form;

        return nextErrors;
      });
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');

    if (mode === 'login') {
      const nextErrors = validateLogin(loginForm);

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors as Record<string, string>);
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        const { data } = await apiClient.post<LoginResponse>('/auth/login', {
          email: loginForm.email.trim(),
          password: loginForm.password,
        });

        saveAuthSession(data);
        window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
        window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
        const targetUrl = getRedirectUrl(data);
        setSuccessMessage(`Login successful! Redirecting to ${data.role} dashboard...`);
        
        setTimeout(() => {
          window.location.assign(targetUrl);
        }, 800);
      } catch (error) {
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message ?? 'Login failed. Please try again.'
          : 'Login failed. Please try again.';

        setErrors({ form: message });
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const nextErrors = validateSignup(signupForm);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors as Record<string, string>);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/signup', {
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        phone: signupForm.phone.trim(),
        password: signupForm.password,
        confirmPassword: signupForm.confirmPassword,
        role: role === 'doctor' ? 'doctor' : 'patient',
      });

      saveAuthSession(data);
      window.localStorage.setItem('careloop.signup.phone', signupForm.phone.trim());
      window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
      window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
      const targetUrl = getRedirectUrl(data);
      setSuccessMessage(
        role === 'doctor'
          ? 'Doctor account created successfully. Redirecting...'
          : 'Account created successfully. Redirecting...',
      );

      setTimeout(() => {
        window.location.assign(targetUrl);
      }, 800);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Signup failed. Please try again.'
        : 'Signup failed. Please try again.';

      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-4 sm:px-6">
      <section
        className={[
          'w-full rounded-2xl border border-slate-200 bg-white shadow-xl',
          isSignup ? 'max-w-3xl p-5 sm:p-6' : 'max-w-md p-6 sm:p-8',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {isSignup && role === 'user' ? (
            <p className="text-sm text-slate-600">
              Are you a doctor?{' '}
              <Link className="font-semibold text-[#15803D] hover:text-[#166534]" to="/doctor-signup">
                Register here
              </Link>
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

        <form
          className={isLogin ? 'mt-6 space-y-4' : 'mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'}
          noValidate
          onSubmit={handleSubmit}
        >
          {isLogin ? (
            <>
              <InputField
                className={baseInputClassName}
                error={errors.email}
                label="Email"
                onChange={handleLoginInput('email')}
                placeholder="you@example.com"
                type="email"
                value={loginForm.email}
              />

              <PasswordField
                label="Password"
                name="password"
                onChange={handleLoginInput('password')}
                placeholder="Enter your password"
                value={loginForm.password}
              />

              {errors.password ? <p className="text-xs font-medium text-rose-500">{errors.password}</p> : null}
              {errors.form ? <p className="text-xs font-medium text-rose-500">{errors.form}</p> : null}

              <Button disabled={isSubmitting} fullWidth type="submit">
                {isSubmitting ? 'Signing in...' : 'Login'}
              </Button>

              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link className="font-semibold text-[#15803D]" to="/signup">
                  Sign Up
                </Link>
              </p>
            </>
          ) : (
            <>
              <InputField
                className={baseInputClassName}
                error={errors.name}
                label="Name"
                onChange={handleSignupInput('name')}
                placeholder="Your full name"
                value={signupForm.name}
              />

              <InputField
                className={baseInputClassName}
                error={errors.email}
                label="Email"
                onChange={handleSignupInput('email')}
                placeholder="you@example.com"
                type="email"
                value={signupForm.email}
              />

              <InputField
                className={baseInputClassName}
                error={errors.phone}
                label="Phone Number"
                maxLength={10}
                onChange={handleSignupInput('phone')}
                placeholder="+91 555 000 0000"
                type="tel"
                value={signupForm.phone}
              />

              <div>
                <PasswordField
                  label="Create Password"
                  name="password"
                  onChange={handleSignupInput('password')}
                  placeholder="Create a password"
                  value={signupForm.password}
                />
                {errors.password ? (
                  <p className="text-xs font-medium text-rose-500">{errors.password}</p>
                ) : null}
              </div>

              <div>
                <PasswordField
                  label="Confirm Password"
                  name="confirmPassword"
                  onChange={handleSignupInput('confirmPassword')}
                  placeholder="Confirm your password"
                  value={signupForm.confirmPassword}
                />
                {errors.confirmPassword ? (
                  <p className="text-xs font-medium text-rose-500">{errors.confirmPassword}</p>
                ) : null}
              </div>

              <Button
                disabled={isSubmitting}
                className="sm:col-span-2 mx-auto h-10 w-full max-w-[180px] rounded-xl px-4 py-2 text-sm"
                type="submit"
              >
                {isSubmitting ? 'Creating...' : 'Sign Up'}
              </Button>

              <p className="text-sm text-slate-600 sm:col-span-2">
                Already have an account?{' '}
                <Link className="font-semibold text-[#15803D]" to="/login">
                  Login
                </Link>
              </p>

              {errors.form ? (
                <p className="text-xs font-medium text-rose-500 sm:col-span-2">{errors.form}</p>
              ) : null}
            </>
          )}

          {successMessage ? (
            <p
              className={[
                'rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700',
                isSignup ? 'sm:col-span-2' : '',
              ].join(' ')}
            >
              {successMessage}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
};

export { AuthForm };
