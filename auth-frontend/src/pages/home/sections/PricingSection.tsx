const pricingPlans = [
  {
    name: 'Free Trial',
    description: 'Best to get started with Care Loop',
    price: 'Rs 0',
    period: '/ month',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'Active',
    limits: ['Doctors Limit: 1 doctor', 'Patients Limit: 100 patients', 'WhatsApp Limit: 200 messages'],
  },
  {
    name: 'Starter',
    description: 'Perfect for solo practitioners & small clinics',
    price: 'Rs 1,999',
    period: '/ month',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'Active',
    limits: ['Doctors Limit: 2 doctors', 'Patients Limit: 500 patients', 'WhatsApp Limit: 1,000 messages'],
  },
  {
    name: 'Pro',
    description: 'Advanced features for growing clinics',
    price: 'Rs 4,999',
    period: '/ month',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'Active',
    limits: ['Doctors Limit: 10 doctors', 'Patients Limit: 5,000 patients', 'WhatsApp Limit: 10,000 messages'],
  },
  {
    name: 'Enterprise',
    description: 'Full power for large hospitals',
    price: 'Rs 14,999',
    period: '/ month',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'Active',
    limits: ['Doctors Limit: 50 doctors', 'Patients Limit: 50,000 patients', 'WhatsApp Limit: 1,00,000 messages'],
  },
];

const PricingSection = () => (
  <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Pricing Plans</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">Simple & Affordable Plans</h2>
      <p className="mt-3 text-slate-600">Choose the best plan for your healthcare needs</p>
    </div>
    <div className="mt-8 grid gap-4 lg:mt-10 lg:gap-6 lg:grid-cols-4">
      {pricingPlans.map((plan) => (
        <article className="group flex h-full min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/30 transition-all duration-300 ease-out hover:-translate-y-2 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-100/70 sm:min-h-[320px] sm:rounded-[24px] sm:p-6" key={plan.name}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-2xl font-bold text-slate-900 transition-colors duration-300 group-hover:text-emerald-700">{plan.name}</p>
            {plan.badge ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors duration-300 group-hover:bg-emerald-600 group-hover:text-white">{plan.badge}</span>
            ) : null}
          </div>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
          <p className="mt-4 text-2xl font-extrabold text-slate-900">
            {plan.price}
            <span className="ml-1 text-base font-semibold text-slate-500">{plan.period}</span>
          </p>
          <ul className="mt-6 min-h-[88px] space-y-2 text-sm leading-5 text-slate-700">
            {plan.limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-auto pt-5">
            <button className={`w-full rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-emerald-200 ${plan.ctaClass}`} type="button">
              Get Started
            </button>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export { PricingSection };
