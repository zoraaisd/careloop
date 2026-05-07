import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';

type HeroSectionProps = {
  featuredSpecializations: string[];
  handleDoctorSearchSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  handleSpecializationSelect: (value: string) => void;
  locationOptions: string[];
  remainingSpecializations: string[];
  search: string;
  selectedLocation: string;
  selectedSpecialization: string;
  setSearch: Dispatch<SetStateAction<string>>;
  setSelectedLocation: Dispatch<SetStateAction<string>>;
  setShowMoreSpecializations: Dispatch<SetStateAction<boolean>>;
  showMoreSpecializations: boolean;
  specializationsRef: RefObject<HTMLDivElement | null>;
};

const HeroSection = ({
  featuredSpecializations,
  handleDoctorSearchSubmit,
  handleSpecializationSelect,
  locationOptions,
  remainingSpecializations,
  search,
  selectedLocation,
  selectedSpecialization,
  setSearch,
  setSelectedLocation,
  setShowMoreSpecializations,
  showMoreSpecializations,
  specializationsRef,
}: HeroSectionProps) => (
  <section className="relative mt-4 sm:mt-6">
    <div className="relative w-full overflow-hidden">
      <img
        alt="Find doctors hero"
        className="h-[calc(100svh-84px)] min-h-[420px] w-full object-cover object-top sm:h-[calc(100svh-96px)] sm:min-h-[500px]"
        src="/heroimage.png"
      />
      <div className="absolute inset-0 bg-slate-900/25" />
      <div className="absolute inset-0 flex items-start justify-center px-3 pt-12 sm:px-4 sm:pt-16">
        <div className="w-full max-w-3xl">
          <h1 className="mb-6 text-center text-3xl font-bold text-white sm:mb-10 sm:text-4xl">Your home for health</h1>
          <div className="grid w-full gap-2 sm:grid-cols-[180px_1fr]">
            <label className="block">
              <select
                className="h-11 w-full appearance-none rounded-lg border border-white/60 bg-white/15 px-3 text-sm text-white shadow-md outline-none backdrop-blur-md focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200/70"
                onChange={(event) => setSelectedLocation(event.target.value)}
                value={selectedLocation}
              >
                {locationOptions.map((location) => (
                  <option className="text-slate-900" key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <form className="block" onSubmit={handleDoctorSearchSubmit}>
              <div className="relative">
                <input
                  className="h-11 w-full rounded-lg border border-white/60 bg-white/15 px-3 pr-11 text-sm text-white shadow-md outline-none backdrop-blur-md placeholder:text-white/80 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200/70"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search doctors, clinics, hospitals, etc."
                  value={search}
                />
                <button
                  aria-label="Search doctors"
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-white/90 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
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
          <div className="mt-2 overflow-x-auto pb-1 sm:pl-[90px]" ref={specializationsRef}>
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap pr-2 text-xs sm:text-sm">
              <p className="font-semibold text-white/90">Popular searches:</p>
              <button
                className={`rounded-full px-2.5 py-1 text-white/95 transition hover:bg-white/20 ${
                  selectedSpecialization === '' ? 'bg-white/20' : ''
                }`}
                onClick={() => handleSpecializationSelect('')}
                type="button"
              >
                All Doctors
              </button>
              {featuredSpecializations.map((specialization) => (
                <button
                  className={`rounded-full px-2.5 py-1 text-white/95 transition hover:bg-white/20 ${
                    selectedSpecialization === specialization ? 'bg-white/20' : ''
                  }`}
                  key={specialization}
                  onClick={() => handleSpecializationSelect(specialization)}
                  type="button"
                >
                  {specialization}
                </button>
              ))}
              <button
                className={`rounded-full px-2.5 py-1 text-white/95 transition hover:bg-white/20 ${
                  showMoreSpecializations ? 'bg-white/20' : ''
                }`}
                onClick={() => setShowMoreSpecializations((current) => !current)}
                type="button"
              >
                Other
              </button>
            </div>
            {showMoreSpecializations ? (
              <div className="mt-3 rounded-xl bg-white/90 p-4 text-slate-800">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingSpecializations.map((specialization) => (
                    <button
                      className={`rounded-lg px-2 py-1.5 text-left text-sm font-medium transition hover:bg-slate-100 ${
                        selectedSpecialization === specialization ? 'bg-slate-200' : ''
                      }`}
                      key={specialization}
                      onClick={() => {
                        handleSpecializationSelect(specialization);
                        setShowMoreSpecializations(false);
                      }}
                      type="button"
                    >
                      {specialization}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export { HeroSection };
