import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

import { LinkButton } from '@/components/ui/Button';
import { getApprovedDoctorRouteId, type ApprovedDoctor } from '@/services/public-doctors';

type DoctorsSectionProps = {
  doctorLoadError: string;
  filteredDoctors: ApprovedDoctor[];
  handleDoctorSearchSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  initialVisibleCount: number;
  isLoadingDoctors: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  showAllDoctors: boolean;
  setShowAllDoctors: Dispatch<SetStateAction<boolean>>;
  visibleDoctors: ApprovedDoctor[];
};

const DoctorsSection = ({
  doctorLoadError,
  filteredDoctors,
  handleDoctorSearchSubmit,
  initialVisibleCount,
  isLoadingDoctors,
  search,
  setSearch,
  showAllDoctors,
  setShowAllDoctors,
  visibleDoctors,
}: DoctorsSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="doctor-cards-section">
      <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/40 backdrop-blur sm:rounded-[32px] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Find doctors</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Browse the doctors available on Care Loop</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Doctor cards now connect directly to approved doctor profiles backed by live backend data.
            </p>
          </div>
          <form className="block w-full max-w-xs" onSubmit={handleDoctorSearchSubmit}>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cardiology, Care Loop Clinic, Dr. Sharma..."
                value={search}
              />
              <button
                aria-label="Search doctors"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 transition hover:bg-slate-50 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                type="submit"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20L16.65 16.65" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {isLoadingDoctors ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-6" key={index}>
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-6 space-y-3">
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))
          ) : doctorLoadError ? (
            <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-8 text-center text-sm text-rose-700 lg:col-span-2">
              {doctorLoadError}
            </div>
          ) : filteredDoctors.length > 0 ? (
            visibleDoctors.map((doctor, index) => {
              const routeId = getApprovedDoctorRouteId(doctor);

              return (
                <article
                  className={[
                    'rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-md shadow-slate-200/30 transition hover:-translate-y-1 hover:shadow-xl sm:p-4',
                    routeId ? 'cursor-pointer' : 'opacity-80',
                  ].join(' ')}
                  key={doctor.userId || doctor.routeId || `${doctor.name}-${index}`}
                  onClick={() => {
                    if (routeId) {
                      navigate(`/doctor/${routeId}`);
                    }
                  }}
                >
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {Number.isFinite(doctor.experience) ? doctor.experience : 0}+ Years Experience
                    </span>
                  </div>
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-emerald-100 bg-emerald-50">
                    {doctor.profileImageUrl ? (
                      <img alt={doctor.name} className="h-full w-full object-cover" src={doctor.profileImageUrl} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-emerald-700">
                        {doctor.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900 sm:mt-4 sm:text-2xl">{doctor.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{doctor.specialization}</p>
                  <div className="mt-4 space-y-1 text-center text-sm text-slate-500">
                    <p><span className="font-semibold text-slate-700">Clinic:</span> {doctor.clinicName}</p>
                    <p><span className="font-semibold text-slate-700">City:</span> {doctor.city || '-'}</p>
                    <p><span className="font-semibold text-slate-700">Patients:</span> {doctor.patientCount}+</p>
                  </div>
                  <div className="mt-6 flex justify-center">
                    {routeId ? (
                      <LinkButton className="rounded-xl border border-emerald-500 px-6 py-2.5 text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800" to={`/doctor/${routeId}`} variant="secondary">
                        View More {'->'}
                      </LinkButton>
                    ) : (
                      <span className="text-xs text-slate-400">Profile unavailable</span>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 lg:col-span-2">
              No approved doctors match your search yet.
            </div>
          )}
        </div>
        {filteredDoctors.length > initialVisibleCount ? (
          <div className="mt-8 text-center">
            <button
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              onClick={() => setShowAllDoctors((value) => !value)}
              type="button"
            >
              {showAllDoctors ? 'Show Less Doctors' : 'View All Doctors'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export { DoctorsSection };
