import type { ReactNode } from 'react';

type SpecialtiesSectionProps = {
  onSelectSpecialization: (value: string) => void;
};

type SpecialtyCard = {
  title: string;
  subtitle: string;
  specialization: string;
  icon: ReactNode;
};

const SpecialtyCircle = ({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) => (
  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${className}`}>
    {children}
  </span>
);

const specialtyCards: SpecialtyCard[] = [
  {
    title: 'Cardiology',
    subtitle: 'Heart care',
    specialization: 'Cardiologist',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-rose-100 via-white to-rose-50">
        <svg aria-hidden="true" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M8.5 12h2l1.3-2.5 1.4 5 1.1-2.5h1.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </SpecialtyCircle>
    ),
  },
  {
    title: 'Dermatology',
    subtitle: 'Skin care',
    specialization: 'Dermatologist',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-violet-100 via-white to-fuchsia-50">
        <svg aria-hidden="true" className="h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24">
          <path d="M12 4c3.8 0 6 2.63 6 5.58 0 4.72-4.36 8.42-6 9.42-1.64-1-6-4.7-6-9.42C6 6.63 8.2 4 12 4Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 11.5c.8-.9 1.8-1.4 2.5-1.4s1.7.5 2.5 1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </SpecialtyCircle>
    ),
  },
  {
    title: 'Pediatrics',
    subtitle: 'Child care',
    specialization: 'Pediatrician',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-amber-100 via-white to-orange-50">
        <svg aria-hidden="true" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7.5 18a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M9 6.2c.4-1 1.5-1.7 3-1.7s2.6.7 3 1.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </SpecialtyCircle>
    ),
  },
  {
    title: 'Gynecology',
    subtitle: 'Women care',
    specialization: 'Gynecologist',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-pink-100 via-white to-rose-50">
        <svg aria-hidden="true" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 13v7M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </SpecialtyCircle>
    ),
  },
  {
    title: 'Neurology',
    subtitle: 'Brain & nerves',
    specialization: 'Psychiatrist',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-indigo-100 via-white to-blue-50">
        <svg aria-hidden="true" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <path d="M12 4c3.9 0 6.5 2.63 6.5 6.2 0 4.15-3.35 7.8-6.5 9.8-3.15-2-6.5-5.65-6.5-9.8C5.5 6.63 8.1 4 12 4Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 8.5c0-1 1-1.8 2-1.8s2 .8 2 1.8-.7 1.4-.7 2.2.7 1.2.7 2.2-1 1.8-2 1.8-2-.8-2-1.8.7-1.4.7-2.2-.7-1.2-.7-2.2Z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </SpecialtyCircle>
    ),
  },
  {
    title: 'Dental',
    subtitle: 'Oral care',
    specialization: 'Dentist',
    icon: (
      <SpecialtyCircle className="bg-gradient-to-br from-cyan-100 via-white to-teal-50">
        <svg aria-hidden="true" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24">
          <path d="M12 4c2.9 0 5 1.7 5 4.5 0 1.95-.78 3.1-1.35 4.2-.6 1.16-.95 2.47-1.23 3.88-.18.91-.62 1.42-1.32 1.42-.78 0-1.1-.6-1.1-1.4V14.5c0-.55-.2-.85-.5-.85s-.5.3-.5.85v2.15c0 .8-.32 1.4-1.1 1.4-.7 0-1.14-.5-1.32-1.42-.28-1.4-.63-2.72-1.23-3.88C7.78 11.6 7 10.45 7 8.5 7 5.7 9.1 4 12 4Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </SpecialtyCircle>
    ),
  },
];

const SpecialtiesSection = ({ onSelectSpecialization }: SpecialtiesSectionProps) => (
  <section className="relative z-10 px-4 py-2 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl rounded-[34px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700 sm:text-left">
            Quick Specialties
          </p>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-950 sm:text-left">
            Find the right care for you
          </h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {specialtyCards.map((card) => (
          <button
            className="group rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f7fbf8)] px-4 py-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
            key={card.title}
            onClick={() => onSelectSpecialization(card.specialization)}
            type="button"
          >
            <div className="flex justify-center">{card.icon}</div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
          </button>
        ))}

        <button
          className="group rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f7fbf8)] px-4 py-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
          onClick={() => onSelectSpecialization('')}
          type="button"
        >
          <div className="flex justify-center">
            <SpecialtyCircle className="bg-gradient-to-br from-emerald-100 via-white to-lime-50">
              <svg aria-hidden="true" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <path d="M7 12h10M12 7l5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </SpecialtyCircle>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">View all</h3>
          <p className="mt-1 text-xs text-slate-500">Specialties</p>
        </button>
      </div>
    </div>
  </section>
);

export { SpecialtiesSection };
