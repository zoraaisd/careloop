const features = [
  {
    title: 'WhatsApp Automation',
    description: 'Automate reminders and patient updates directly over WhatsApp.',
  },
  {
    title: 'Patient Management',
    description: 'Manage patient details, history, and follow-ups from a single dashboard.',
  },
  {
    title: 'Appointment Tracking',
    description: 'Track bookings, confirmations, and reschedules with real-time status.',
  },
  {
    title: 'Health Records',
    description: 'Maintain health records, prescriptions, and consultation notes securely.',
  },
];

const FeaturesSection = () => (
  <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16" id="about-section">
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">
        Features
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        Everything your healthcare team needs in one place
      </h2>
    </div>

    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {features.map((feature, index) => (
        <article
          className="group rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/40 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl sm:rounded-[28px] sm:p-6"
          key={feature.title}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-lg font-bold text-[#16A34A]">
            0{index + 1}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 sm:mt-5 sm:text-xl">{feature.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {feature.description}
          </p>
        </article>
      ))}
    </div>
  </section>
);

export { FeaturesSection };
