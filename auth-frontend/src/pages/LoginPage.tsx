import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { PasswordField } from '@/components/PasswordField';

const ADMIN_APP_URL = 'http://localhost:5174';
const DOCTOR_APP_URL = 'http://localhost:5175';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = email.trim().toLowerCase();
    const targetRoute =
      normalized.includes('admin') || normalized.startsWith('a')
        ? ADMIN_APP_URL
        : DOCTOR_APP_URL;

    window.location.href = targetRoute;
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white/85 shadow-2xl shadow-slate-200/50 backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden bg-gradient-to-br from-[#0C4A8A] via-[#1565D8] to-[#2D8CFF] p-10 text-white lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
            Meditracker
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Welcome back to your healthcare workspace
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-blue-50">
            Sign in to review consultations, manage patients, and keep your operations moving.
          </p>
          <div className="mt-10 rounded-[28px] bg-white/10 p-6">
            <p className="text-sm text-blue-100">Quick demo routing</p>
            <p className="mt-3 text-sm leading-7 text-white/90">
              Use an email containing <span className="font-semibold">admin</span> to enter the
              admin app. Any other email opens the doctor app.
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <Link className="text-sm font-medium text-[#2D8CFF]" to="/">
              {'< Back to Home'}
            </Link>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">Login</h2>
            <p className="mt-2 text-sm text-slate-500">
              Access the admin panel or doctor dashboard with your Meditracker account.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <InputField
                autoComplete="email"
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@meditracker.com"
                required
                type="email"
                value={email}
              />

              <PasswordField
                label="Password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                value={password}
              />

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-slate-500">
                  <input className="rounded border-slate-300 text-[#2D8CFF]" type="checkbox" />
                  Remember me
                </label>
                <a className="font-medium text-[#2D8CFF]" href="/">
                  Forgot Password?
                </a>
              </div>

              <Button fullWidth type="submit">
                Login
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              New to Meditracker?{' '}
              <Link className="font-semibold text-[#2D8CFF]" to="/signup">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export { LoginPage };
