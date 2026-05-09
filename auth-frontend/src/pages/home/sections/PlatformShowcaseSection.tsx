const dashboardStats = [
  { label: 'Appointments', value: '128', trend: '+18% from yesterday' },
  { label: 'New Patients', value: '32', trend: '+6% from yesterday' },
  { label: 'Follow-ups', value: '76', trend: '+10% from yesterday' },
];

const appointmentRows = [
  { time: '10:30 AM', name: 'Rahul Mehta', specialty: 'Cardiology' },
  { time: '11:00 AM', name: 'Priya Sharma', specialty: 'Dermatology' },
  { time: '11:30 AM', name: 'Anita Verma', specialty: 'General Physician' },
];

const chartHeights = ['h-10', 'h-14', 'h-12', 'h-20', 'h-16', 'h-24', 'h-28'];
const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PlatformShowcaseSection = () => (
  <section className="px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,252,248,0.92))] p-4 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Platform Preview</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Built for clinics that want less chaos and better follow-through.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          From appointments to reminders, CareLoop gives teams one operational layer that feels calm,
          efficient, and easy to trust.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_2.2fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-white via-emerald-50/60 to-slate-50 p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            CareLoop
          </span>
          <h2 className="mt-5 max-w-xs text-3xl font-semibold leading-tight text-slate-900">
            All-in-one Platform for Modern Healthcare
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            {[
              'WhatsApp automation & reminders',
              'Patient management & follow-ups',
              'Appointment scheduling & tracking',
              'Digital health records',
              'Reports, analytics & insights',
            ].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path d="M5 12.5L9 16.5L19 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-semibold text-white">
                  CL
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">CareLoop</p>
                  <p className="text-xs text-slate-500">Healthcare operations overview</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Today</p>
                <p className="font-medium text-emerald-600">Live sync</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {dashboardStats.map((stat) => (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" key={stat.label}>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-xs font-medium text-emerald-600">{stat.trend}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Upcoming Appointments</h3>
                  <span className="text-xs text-slate-400">Today</span>
                </div>
                <div className="mt-4 space-y-3">
                  {appointmentRows.map((row) => (
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm" key={row.time}>
                      <span className="text-xs font-medium text-slate-500">{row.time}</span>
                      <div className="flex-1 px-3">
                        <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.specialty}</p>
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Appointments Overview</h3>
                  <span className="text-xs text-slate-400">This week</span>
                </div>
                <div className="mt-6 flex h-44 items-end justify-between gap-2 rounded-2xl bg-white px-4 pb-4 pt-8 shadow-sm">
                  {chartHeights.map((height, index) => (
                    <div className="flex flex-1 flex-col items-center gap-3" key={chartDays[index]}>
                      <div className={`w-full rounded-t-2xl bg-gradient-to-t from-emerald-500 to-emerald-300 ${height}`} />
                      <span className="text-[11px] text-slate-500">{chartDays[index]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-gradient-to-b from-white to-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">WhatsApp Automation</p>
              <p className="text-xs text-slate-500">Patient reminders made simple</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-200">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.56 2 2.11 6.44 2.11 11.91c0 1.75.46 3.47 1.33 4.99L2 22l5.25-1.38a9.88 9.88 0 0 0 4.77 1.22h.01c5.47 0 9.91-4.44 9.91-9.91 0-2.65-1.03-5.14-2.89-7.02ZM12.03 20.2h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.03-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.51 3.67-8.18 8.19-8.18 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 0 1 2.39 5.78c0 4.52-3.67 8.2-8.18 8.2Zm4.49-6.11c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.15.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.24-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.84-.2-.48-.41-.41-.56-.41h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29Z" />
              </svg>
            </div>
          </div>

          <div className="mt-5 rounded-[26px] bg-[#128C7E] p-4 text-white shadow-[0_20px_50px_rgba(18,140,126,0.25)]">
            <div className="rounded-[20px] bg-white/10 p-3">
              <p className="text-sm font-semibold">CareLoop Chat</p>
              <p className="mt-1 text-xs text-white/80">Hi Ramesh, this is a reminder for your appointment at 10:30 AM.</p>
              <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                Please reply CONFIRM to confirm.
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-700" type="button">
                  CONFIRM
                </button>
                <button className="rounded-xl border border-white/40 px-3 py-2 text-xs font-semibold text-white" type="button">
                  RESCHEDULE
                </button>
              </div>
            </div>

            <div className="mt-4 ml-auto max-w-[85%] rounded-2xl bg-white/90 px-3 py-2 text-xs text-slate-700">
              Your appointment is confirmed. See you tomorrow.
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Automation rate</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">92%</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">No-show reduction</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">-34%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export { PlatformShowcaseSection };
