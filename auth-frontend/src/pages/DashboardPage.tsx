import { LinkButton } from '@/components/Button';

type DashboardPageProps = {
  role: 'admin' | 'doctor';
};

const dashboardContent = {
  admin: {
    title: 'Admin Dashboard',
    subtitle: 'Oversee staff performance, operational health, and system activity across Care Loop.',
    metrics: [
      { label: 'Active Doctors', value: '86' },
      { label: 'Appointments Today', value: '324' },
      { label: 'Patient Registrations', value: '57' },
    ],
    tasks: ['Approve doctor onboarding', 'Review consultation analytics', 'Monitor system alerts'],
  },
  doctor: {
    title: 'Doctor Dashboard',
    subtitle: 'Manage consultations, patient queues, and treatment updates from one clinical view.',
    metrics: [
      { label: 'Consultations Today', value: '18' },
      { label: 'Pending Reports', value: '07' },
      { label: 'Follow-up Patients', value: '26' },
    ],
    tasks: ['Review appointment queue', 'Update patient notes', 'Complete follow-up summaries'],
  },
};

const DashboardPage = ({ role }: DashboardPageProps) => {
  const content = dashboardContent[role];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">
                Care Loop
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{content.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{content.subtitle}</p>
            </div>
            <div className="flex gap-3">
              <LinkButton to="/login" variant="secondary">
                Switch Account
              </LinkButton>
              <LinkButton to="/">Back to Home</LinkButton>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {content.metrics.map((metric) => (
              <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-5" key={metric.label}>
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#10233D] to-[#15803D] p-6 text-white">
              <p className="text-sm text-green-100">Operational snapshot</p>
              <h2 className="mt-3 text-2xl font-semibold">Today's focus areas</h2>
              <div className="mt-6 space-y-4">
                {content.tasks.map((task) => (
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4" key={task}>
                    <span className="text-sm">{task}</span>
                    <span className="rounded-full bg-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-100 bg-white p-6">
              <p className="text-sm font-semibold text-slate-500">Recent activity</p>
              <div className="mt-5 space-y-4">
                {[
                  'Patient consultation records synced successfully.',
                  'New schedule updates published to the care team.',
                  "Secure audit logs refreshed for today's sessions.",
                ].map((item) => (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export { DashboardPage };
