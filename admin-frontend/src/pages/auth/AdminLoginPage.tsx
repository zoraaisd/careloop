import axios from 'axios';
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { PasswordField } from '@/components/ui/PasswordField';
import { apiClient } from '@/services/api';
import { saveAuthSession } from '@/services/auth-storage';

type LoginFormState = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  role: 'admin' | 'doctor' | 'patient';
  userId: string;
  name?: string;
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInput = (field: keyof LoginFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setErrorMessage('');
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    if (!form.password.trim()) nextErrors.password = 'Password is required';
    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      });

      if (data.role !== 'admin') {
        setErrorMessage('Access denied. This portal is for administrators only.');
        setIsSubmitting(false);
        return;
      }

      saveAuthSession({
        token: data.token,
        role: 'admin',
        userId: data.userId,
      });

      navigate('/admin/dashboard');
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Admin Portal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Please sign in to access the management console
          </p>
        </div>
        
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <InputField
              label="Admin Email"
              onChange={handleInput('email')}
              placeholder="admin@careloop.in"
              type="email"
              value={form.email}
              error={errors.email}
              autoComplete="email"
            />

            <PasswordField
              label="Password"
              name="password"
              onChange={handleInput('password')}
              placeholder="••••••••"
              value={form.password}
            />
            {errors.password && <p className="text-xs font-medium text-rose-500">{errors.password}</p>}

            {errorMessage && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}

            <div>
              <Button
                disabled={isSubmitting}
                fullWidth
                type="submit"
                className="rounded-xl"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Admin'}
              </Button>
            </div>
          </form>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} CareLoop Admin. Secure Access Only.
          </p>
        </div>
      </div>
    </main>
  );
};

export { AdminLoginPage };
