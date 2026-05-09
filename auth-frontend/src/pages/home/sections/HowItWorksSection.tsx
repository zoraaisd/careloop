const steps = [
  {
    number: '01',
    title: 'Search Clinic',
    description: 'Find trusted clinics near you',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Choose Doctor',
    description: 'Select the right specialist',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M12 4v16M4 12h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <rect height="16" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Book Appointment',
    description: 'Pick a slot that suits you',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
        <path d="M8 3v6M16 3v6M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Get Reminders',
    description: 'Receive WhatsApp reminders',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M8 18l-3 1 1-3a7 7 0 1 1 2 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Manage Health',
    description: 'Access records, reports and more',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M12 21s7-4.2 7-10V6l-7-3-7 3v5c0 5.8 7 10 7 10Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 12h6M12 9v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    ),
  },
];

const HowItWorksSection = () => (
  <section className="px-4 py-3 sm:px-6 lg:px-8">
    <div className="mx-auto grid max-w-7xl gap-4 rounded-[34px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5 lg:grid-cols-[0.85fr_2.15fr] lg:items-stretch lg:gap-5">
      <div className="flex h-full flex-col justify-center rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbf8)] p-6 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">How CareLoop Works</p>
        <h2 className="mt-3 max-w-xs text-[2rem] font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-[2.35rem]">
          Healthcare made simple in 5 steps
        </h2>
        <p className="mt-4 max-w-sm text-[15px] leading-7 text-slate-600">
          From booking to follow-ups, we make the entire process seamless for you.
        </p>
        <button
          className="mt-7 w-fit rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          type="button"
        >
          Explore All Features
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white px-5 py-7 shadow-sm sm:px-6 sm:py-8 lg:px-7">
        <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-3 lg:gap-y-0">
          {steps.map((step, index) => (
            <div className="relative text-center lg:px-2" key={step.number}>
              {index < steps.length - 1 ? (
                <span className="absolute left-[calc(50%+1.45rem)] top-6 hidden h-px w-[calc(100%-1.1rem)] border-t border-dashed border-emerald-200 lg:block" />
              ) : null}
              <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] ring-4 ring-emerald-50">
                {step.icon}
              </div>
              <p className="mt-4 text-[11px] font-bold tracking-[0.24em] text-slate-400">{step.number}</p>
              <h3 className="mt-2 text-[15px] font-semibold text-slate-900">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-[150px] text-[13px] leading-6 text-slate-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export { HowItWorksSection };
