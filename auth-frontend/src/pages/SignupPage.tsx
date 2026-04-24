import axios from 'axios';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { PasswordField } from '@/components/PasswordField';
import { apiClient } from '@/services/api';
import { saveAuthSession, type AuthRole } from '@/services/auth-storage';

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
  message: string;
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

  return `${authAppUrl}/dashboard`;
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
  const [form, setForm] = useState<PatientSignupForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        delete nextErrors.form;
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

    if (form.isDoctor) {
      navigate('/doctor-signup', {
        state: {
          basicDetails: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
          },
        },
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<SignupResponse>('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: 'patient',
      });

      saveAuthSession(data);
      window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
      window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
      setSuccessMessage('Account created successfully. Redirecting...');
      window.setTimeout(() => {
        window.location.assign(getRedirectUrl(data));
      }, 700);
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Care Loop</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Create your account</h1>
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

          {errors.form ? <p className="text-xs font-medium text-rose-500 sm:col-span-2">{errors.form}</p> : null}
          {successMessage ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
              {successMessage}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button className="rounded-2xl px-6" disabled={isSubmitting} type="submit">
              {form.isDoctor ? 'Next' : isSubmitting ? 'Creating...' : 'Create account'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export { SignupPage };
