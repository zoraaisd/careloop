import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { PasswordField } from '@/components/PasswordField';

type Role = 'doctor' | 'admin';

const getPasswordStrength = (password: string) => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Weak', width: 'w-1/4', color: 'bg-rose-400' };
  }

  if (score <= 3) {
    return { label: 'Medium', width: 'w-2/4', color: 'bg-amber-400' };
  }

  return { label: 'Strong', width: 'w-full', color: 'bg-emerald-500' };
};

const SignupPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('doctor');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    experience: '',
    licenseNumber: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(role === 'admin' ? '/admin/dashboard' : '/doctor/dashboard');
  };

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-[#2D8CFF]" to="/">
              ← Back to Home
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Create your Meditracker account
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Set up secure access for administrators and doctors with a responsive onboarding flow.
            </p>
          </div>
          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-[#1565D8]">
            Role-based onboarding
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField
              label="Name"
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Full name"
              required
              value={form.name}
            />
            <InputField
              label="Email"
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@meditracker.com"
              required
              type="email"
              value={form.email}
            />
            <InputField
              label="Phone"
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="+91 98765 43210"
              required
              value={form.phone}
            />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#2D8CFF] focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setRole(event.target.value as Role)}
                value={role}
              >
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <PasswordField
                label="Password"
                name="password"
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Create a secure password"
                value={form.password}
              />
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={[
                      'h-2 rounded-full transition-all duration-300',
                      passwordStrength.color,
                      passwordStrength.width,
                    ].join(' ')}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Password strength: {passwordStrength.label}
                </p>
              </div>
            </div>

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              placeholder="Confirm your password"
              value={form.confirmPassword}
            />
          </div>

          {role === 'doctor' ? (
            <div className="rounded-[28px] border border-blue-100 bg-blue-50/60 p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Doctor Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  These extra fields appear only for doctor registrations.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <InputField
                  label="Specialization"
                  onChange={(event) => updateField('specialization', event.target.value)}
                  placeholder="Cardiology"
                  required
                  value={form.specialization}
                />
                <InputField
                  label="Experience"
                  onChange={(event) => updateField('experience', event.target.value)}
                  placeholder="8 years"
                  required
                  value={form.experience}
                />
                <InputField
                  label="License Number"
                  onChange={(event) => updateField('licenseNumber', event.target.value)}
                  placeholder="MED-2048"
                  required
                  value={form.licenseNumber}
                />
              </div>
            </div>
          ) : null}

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              checked={acceptedTerms}
              className="mt-1 rounded border-slate-300 text-[#2D8CFF]"
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              I agree to the terms and conditions and consent to secure healthcare data processing.
            </span>
          </label>

          <Button fullWidth disabled={!acceptedTerms} type="submit">
            Create Account
          </Button>
        </form>
      </div>
    </main>
  );
};

export { SignupPage };
