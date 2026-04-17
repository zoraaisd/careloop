const metrics = [
  { label: 'Consultations Today', value: '18' },
  { label: 'Pending Reports', value: '07' },
  { label: 'Follow-up Patients', value: '26' },
];

const tasks = [
  'Review appointment queue',
  'Update patient notes',
  'Complete follow-up summaries',
];

const DashboardPage = () => {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2D8CFF]">
                Meditracker
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Doctor Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Manage consultations, patient queues, and treatment updates from one clinical view.
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full bg-[#2D8CFF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#1565D8]"
              href="http://localhost:5173/login"
            >
              Go to Auth App
            </a>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {metrics.map((metric) => (
              <div
                className="rounded-[28px] border border-slate-100 bg-slate-50 p-5"
                key={metric.label}
              >
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#10233D] to-[#1565D8] p-6 text-white">
              <p className="text-sm text-blue-100">Clinical workflow</p>
              <h2 className="mt-3 text-2xl font-semibold">Today’s focus areas</h2>
              <div className="mt-6 space-y-4">
                {tasks.map((task) => (
                  <div
                    className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4"
                    key={task}
                  >
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
                  'Secure audit logs refreshed for today’s sessions.',
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
