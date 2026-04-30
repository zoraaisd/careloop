import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import { doctorSpecializations } from '@/constants/doctorSpecializations';
import { getApprovedDoctorRouteId, getApprovedDoctors, type ApprovedDoctor } from '@/services/public-doctors';

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

const pricingPlans = [
  {
    name: 'Free',
    price: '₹0',
    period: '/ month',
    accent: 'text-emerald-600',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    features: ['1 Consultation', 'Basic Booking', 'Patient Profile', 'Email Support'],
  },
  {
    name: 'Starter',
    price: '₹999',
    period: '/ month',
    accent: 'text-emerald-600',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    features: ['2 Doctor Consultations', 'Basic Health Checkup', 'Priority Appointment', '24/7 Support'],
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: '/ month',
    accent: 'text-emerald-600',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    features: ['5 Doctor Consultations', 'Advanced Health Checkup', 'Priority Appointment', '24/7 Support'],
  },
  {
    name: 'Premium',
    price: '₹3,999',
    period: '/ month',
    accent: 'text-emerald-600',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
    features: ['Unlimited Consultations', 'Full Body Health Checkup', 'Priority Appointment', '24/7 Support'],
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [showMoreSpecializations, setShowMoreSpecializations] = useState(false);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorLoadError, setDoctorLoadError] = useState('');
  const specializationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadDoctors = async () => {
      setIsLoadingDoctors(true);
      setDoctorLoadError('');
      try {
        const response = await getApprovedDoctors();
        setDoctors(response);
      } catch {
        setDoctors([]);
        setDoctorLoadError('Unable to load doctors right now.');
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    void loadDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const term = search.trim().toLowerCase();
    const specializationMatches =
      !selectedSpecialization ||
      (selectedSpecialization === 'Other'
        ? !doctorSpecializations.includes(doctor.specialization as (typeof doctorSpecializations)[number])
        : doctor.specialization === selectedSpecialization);
    const locationMatches =
      selectedLocation === 'All Locations' ||
      !selectedLocation ||
      (doctor.city || '').toLowerCase() === selectedLocation.toLowerCase();

    if (!term) {
      return specializationMatches && locationMatches;
    }

    const searchMatches = [doctor.name, doctor.specialization, doctor.clinicName, doctor.aboutDoctor ?? '', doctor.city]
      .join(' ')
      .toLowerCase()
      .includes(term);

    return specializationMatches && locationMatches && searchMatches;
  });
  const locationOptions = ['All Locations', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi'];
  const initialVisibleCount = filteredDoctors.length >= 8 ? 8 : 4;
  const visibleDoctors = showAllDoctors ? filteredDoctors : filteredDoctors.slice(0, initialVisibleCount);
  const featuredSpecializations: string[] = ['Dermatologist', 'Pediatrician', 'Gynecologist'];
  const remainingSpecializations = doctorSpecializations.filter(
    (specialization) => !featuredSpecializations.includes(specialization),
  );

  const scrollToDoctorCards = () => {
    document.getElementById('doctor-cards-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSpecializationSelect = (value: string) => {
    setSelectedSpecialization(value);
    scrollToDoctorCards();
  };

  useEffect(() => {
    if (!showMoreSpecializations) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!specializationsRef.current?.contains(event.target as Node)) {
        setShowMoreSpecializations(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreSpecializations]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="home-section">
        <section className="relative mt-6">
          <div className="relative w-full overflow-hidden">
            <img
              alt="Find doctors hero"
              className="h-[calc(100vh-96px)] min-h-[500px] w-full object-cover   object-top"
              src="/heroimage.png"
            />
            <div className="absolute inset-0 bg-slate-900/25" />
            <div className="absolute inset-0 flex items-start justify-center px-4 pt-16">
              <div className="w-full max-w-3xl">
                <h1 className="mb-10 text-center text-4xl font-bold text-white">Your home for health</h1>
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
                  <label className="block">
                    <div className="relative">
                      <input
                        className="h-11 w-full rounded-lg border border-white/60 bg-white/15 px-3 pr-9 text-sm text-white shadow-md outline-none backdrop-blur-md placeholder:text-white/80 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200/70"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search doctors, clinics, hospitals, etc."
                        value={search}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/90" aria-hidden="true">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                          <path d="M20 20L16.65 16.65" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      </span>
                    </div>
                  </label>
                </div>
                <div className="mt-2 sm:pl-[90px]" ref={specializationsRef}>
                <div className="flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm">
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
                    style={{ marginLeft: 'auto' }}
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

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="doctor-cards-section">
          <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Find doctors</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Browse the doctors available on Care Loop</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Doctor cards now connect directly to approved doctor profiles backed by live backend data.
                </p>
              </div>
              <label className="block w-full max-w-xs">
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cardiology, Care Loop Clinic, Dr. Sharma..."
                    value={search}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400" aria-hidden="true">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                      <path d="M20 20L16.65 16.65" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        'rounded-[18px] border border-slate-100 bg-white p-4 text-center shadow-md shadow-slate-200/30 transition hover:-translate-y-1 hover:shadow-xl',
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
                      <h3 className="mt-4 text-2xl font-bold text-slate-900">{doctor.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">{doctor.specialization}</p>
                      <div className="mt-4 space-y-1 text-center text-sm text-slate-500">
                        <p><span className="font-semibold text-slate-700">Clinic:</span> {doctor.clinicName}</p>
                        <p><span className="font-semibold text-slate-700">City:</span> {doctor.city || '-'}</p>
                        <p><span className="font-semibold text-slate-700">Patients:</span> {doctor.patientCount}+</p>
                      </div>
                      <div className="mt-6 flex justify-center">
                        {routeId ? (
                          <LinkButton className="rounded-xl border border-emerald-500 px-6 py-2.5 text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800" to={`/doctor/${routeId}`} variant="secondary">
                            View More →
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

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16" id="about-section">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Everything your healthcare team needs in one place
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <article
                className="group rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-lg shadow-slate-200/40 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
                key={feature.title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-lg font-bold text-[#16A34A]">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Pricing Plans</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Simple & Affordable Plans</h2>
            <p className="mt-3 text-slate-600">Choose the best plan for your healthcare needs</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30" key={plan.name}>
                <p className="text-lg font-bold text-slate-900">{plan.name}</p>
                <p className={`mt-3 text-4xl font-extrabold ${plan.accent}`}>
                  {plan.price}
                  <span className="ml-1 text-base font-semibold text-slate-500">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.features.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <button className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${plan.ctaClass}`} type="button">
                  Get Started
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-200" id="contact-section">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-xl font-bold text-white">CARE LOOP</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Care Loop is your trusted partner in healthcare. We connect you with the best doctors and provide quality care.
            </p>
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">Quick Links</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>Home</p>
              <p>About Us</p>
              <p>Our Doctors</p>
              <p>Contact Us</p>
            </div>
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">Our Services</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>General Consultation</p>
              <p>Specialist Consultation</p>
              <p>Health Checkups</p>
              <p>Emergency Care</p>
            </div>
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">Newsletter</h4>
            <p className="mt-3 text-sm text-slate-400">Subscribe for health tips and updates.</p>
            <input
              className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Enter your email"
              type="email"
            />
            <button className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700" type="button">
              Subscribe
            </button>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-400">
          © 2026 Care Loop. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
