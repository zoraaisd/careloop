import { LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';

const features = [
  {
    title: 'Doctor Dashboard',
    description:
      'Track consultations, manage schedules, and review patient history from a focused clinical workspace.',
  },
  {
    title: 'Admin Panel',
    description:
      'Oversee doctors, appointments, and operational performance with clear system-wide visibility.',
  },
  {
    title: 'Secure Data',
    description:
      'Protect sensitive records with structured access, secure flows, and dependable data handling.',
  },
  {
    title: 'Real-time Updates',
    description:
      'Stay in sync with live appointment changes, recent activity, and team coordination signals.',
  },
];

const stats = [
  { label: 'Patients Managed', value: '12K+' },
  { label: 'Doctors Onboarded', value: '280+' },
  { label: 'Daily Consultations', value: '1.8K' },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-green-100 bg-white/80 px-4 py-2 text-sm font-medium text-[#15803D] shadow-sm">
                Trusted workflows for modern clinics and care teams
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Smart Healthcare Management System
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Care Loop helps healthcare teams manage patients, doctors, and
                consultations through one responsive platform built for clarity and speed.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton className="px-7" to="/signup">
                  Get Started
                </LinkButton>
                <LinkButton className="px-7" to="/login" variant="secondary">
                  Login
                </LinkButton>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-lg shadow-slate-200/50 backdrop-blur"
                    key={stat.label}
                  >
                    <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-8 top-6 h-32 rounded-full bg-green-300/20 blur-3xl" />
              <div className="relative rounded-[32px] border border-white/60 bg-slate-950 p-4 shadow-2xl shadow-green-900/15">
                <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-900 to-[#14532D] p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-green-100">Today at Care Loop</p>
                      <h2 className="mt-2 text-2xl font-bold">Care operations at a glance</h2>
                    </div>
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Live
                    </span>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/10 p-5">
                      <p className="text-sm text-green-100">Appointments</p>
                      <p className="mt-3 text-3xl font-bold">148</p>
                      <p className="mt-2 text-xs text-slate-300">27 scheduled in the next 2 hours</p>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5">
                      <p className="text-sm text-green-100">Doctors Available</p>
                      <p className="mt-3 text-3xl font-bold">36</p>
                      <p className="mt-2 text-xs text-slate-300">Across 9 active departments</p>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-100">Patient satisfaction</p>
                          <p className="mt-3 text-3xl font-bold">96.4%</p>
                        </div>
                        <div className="h-24 w-24 rounded-full border-[10px] border-emerald-300/20 border-t-emerald-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Everything your healthcare team needs in one place
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <article
                className="group rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-lg shadow-slate-200/40 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
                key={feature.title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-lg font-bold text-[#16A34A]">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>(c) 2026 Care Loop. Smarter healthcare coordination.</p>
          <div className="flex gap-6">
            <a href="#top">Home</a>
            <a href="/login">Login</a>
            <a href="/signup">Signup</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
