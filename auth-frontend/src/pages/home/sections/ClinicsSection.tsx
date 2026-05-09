import type { Dispatch, FormEvent, SetStateAction } from 'react';

import { LinkButton } from '@/components/ui/Button';
import {
  clinicCategories,
  type ClinicCategory,
  type PublicClinic,
} from '@/services/public-clinics';

const LocationIcon = () => (
  <svg aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
    <path
      d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const DoctorsIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
    <path
      d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const TimeIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>
);

type ClinicsSectionProps = {
  clinicLoadError: string;
  filteredClinics: PublicClinic[];
  handleClinicSearchSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  isLoadingClinics: boolean;
  onCategorySelect: (category: ClinicCategory) => void;
  search: string;
  selectedCategory: ClinicCategory;
  setSearch: Dispatch<SetStateAction<string>>;
};

const ClinicsSection = ({
  clinicLoadError,
  filteredClinics,
  handleClinicSearchSubmit,
  isLoadingClinics,
  onCategorySelect,
  search,
  selectedCategory,
  setSearch,
}: ClinicsSectionProps) => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" id="clinic-cards-section">
      <div className="rounded-[24px] border border-emerald-100/80 bg-white/90 p-4 shadow-xl shadow-emerald-100/40 backdrop-blur sm:rounded-[28px] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Find Clinics</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Browse trusted clinics on CareLoop
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Discover verified clinics, hospitals, and healthcare centers based on speciality, location,
              and available doctors.
            </p>
          </div>
          <form className="block w-full max-w-md" onSubmit={handleClinicSearchSubmit}>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clinics, hospitals, speciality, city..."
                value={search}
              />
              <button
                aria-label="Search clinics"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-slate-400 transition hover:bg-slate-50 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                type="submit"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20L16.65 16.65" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {clinicCategories.map((category) => (
            <button
              className={[
                'rounded-full border px-4 py-2 text-sm font-semibold transition',
                selectedCategory === category
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'border-emerald-100 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
              ].join(' ')}
              key={category}
              onClick={() => onCategorySelect(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoadingClinics ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-4"
                key={index}
              >
                <div className="h-32 animate-pulse rounded-[18px] bg-slate-200" />
                <div className="mt-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 space-y-2.5">
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))
          ) : clinicLoadError ? (
            <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-8 text-center text-sm text-rose-700 sm:col-span-2 xl:col-span-3">
              {clinicLoadError}
            </div>
          ) : filteredClinics.length > 0 ? (
            filteredClinics.map((clinic) => (
              <article
                className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-md shadow-slate-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                key={clinic.id}
              >
                <div className="relative bg-emerald-50">
                  {clinic.imageUrl ? (
                    <img
                      alt={clinic.name}
                      className="h-32 w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-36"
                      src={clinic.imageUrl}
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-5xl font-bold text-emerald-700 sm:h-36">
                      {clinic.name.slice(0, 1)}
                    </div>
                  )}
                  {clinic.verified ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">✓</span>
                      Verified
                    </span>
                  ) : null}
                </div>

                <div className="relative px-4 pb-4 pt-5">
                  <div className="absolute -top-7 left-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white">
                    {clinic.logoUrl ? (
                      <img alt="" className="h-10 w-10 rounded-full object-contain" src={clinic.logoUrl} />
                    ) : clinic.imageUrl ? (
                      <img alt="" className="h-10 w-10 rounded-full object-cover" src={clinic.imageUrl} />
                    ) : (
                      <span className="text-lg font-bold text-emerald-700">{clinic.name.slice(0, 1)}</span>
                    )}
                  </div>

                  <div className="pt-5">
                    <h3 className="line-clamp-2 text-[1.35rem] font-bold leading-7 text-slate-950">{clinic.name}</h3>
                    <p className="mt-1 text-base text-slate-800">{clinic.category} Clinic</p>
                    <p className="mt-3 text-sm text-slate-600">{clinic.category}</p>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                      <LocationIcon />
                      <p className="line-clamp-1">{clinic.location}</p>
                    </div>

                    <div className="mt-4 flex items-center gap-5 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <DoctorsIcon />
                        <span>{clinic.doctorsCount} Doctors</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TimeIcon />
                        <span>{clinic.yearsOfService}+ Years</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <LinkButton
                        className="w-full rounded-lg px-4 py-2.5 text-sm shadow-md shadow-emerald-200/60"
                        to={`/clinics/${clinic.id}`}
                        variant="primary"
                      >
                        View Clinic
                      </LinkButton>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
              No clinics match your search and category yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export { ClinicsSection };
