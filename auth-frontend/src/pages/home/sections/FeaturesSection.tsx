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
  <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16" id="about-section">
    <div className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] backdrop-blur sm:p-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Features
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Everything your healthcare team needs in one place
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          A single workflow for reminders, records, appointments, and patient follow-up without the
          usual operational clutter.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {features.map((feature, index) => (
        <article
          className="group rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff,#f8fbf8)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl sm:p-6"
          key={feature.title}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-700">
            0{index + 1}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 sm:mt-5 sm:text-xl">{feature.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {feature.description}
          </p>
        </article>
      ))}
      </div>
    </div>
  </section>
);

export { FeaturesSection };
