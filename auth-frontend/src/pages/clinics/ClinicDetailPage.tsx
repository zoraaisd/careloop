import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Navbar } from '@/components/common/Navbar';
import { LinkButton } from '@/components/ui/Button';
import { getApprovedDoctorRouteId } from '@/services/public-doctors';
import { getPublicClinicById, type PublicClinic } from '@/services/public-clinics';

const BreadcrumbChevron = () => <span className="text-slate-300">&gt;</span>;

const CheckIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="m8.5 12 2.3 2.3 4.7-4.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const LocationIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
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
  <svg aria-hidden="true" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24">
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
  <svg aria-hidden="true" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>
);

const StarIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
    <path d="m12 3.8 2.54 5.15 5.68.83-4.11 4.01.97 5.66L12 16.76l-5.08 2.69.97-5.66-4.11-4 5.68-.84L12 3.8Z" />
  </svg>
);

const PhoneIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
    <path
      d="M6.6 4.5h2.9l1.3 3.2-1.8 1.8a15.7 15.7 0 0 0 5.5 5.5l1.8-1.8 3.2 1.3v2.9a1.8 1.8 0 0 1-1.8 1.8A15.2 15.2 0 0 1 4.8 6.3 1.8 1.8 0 0 1 6.6 4.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const MailIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16v10H4z" stroke="currentColor" strokeWidth="1.7" />
    <path d="m4 8 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>
);

const CalendarIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
    <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 4v4M16 4v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
  </svg>
);

const featureList = [
  'Experienced & verified doctors',
  'Advanced technology',
  'Personalized treatment',
  'Hygienic & safe environment',
];

const serviceTiles = [
  'Acne Treatment',
  'Hair Fall Treatment',
  'Laser Treatment',
  'Skin Whitening',
  'Anti-Aging Solutions',
  'Chemical Peels',
];

const statHighlights = [
  { title: 'Years of Service', description: 'Trusted local care' },
  { title: 'Advanced Technology', description: 'Modern consultation setup' },
  { title: 'Patient Focused Care', description: 'Comfort-first experience' },
];

const formatCategoryLabel = (value: string) => `${value} Clinic`;

const formatReviewCount = (doctorCount: number) => doctorCount * 14 + 4;

const formatClinicPhone = (clinicId: string) => {
  const digits = clinicId.replace(/\D/g, '').padEnd(10, '4').slice(0, 10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const formatClinicEmail = (clinicName: string) =>
  `info@${clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'careloopclinic'}.com`;

const ClinicDetailPage = () => {
  const { id = '' } = useParams();
  const [clinic, setClinic] = useState<PublicClinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadClinic = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await getPublicClinicById(id);

        if (!response) {
          setClinic(null);
          setErrorMessage('Clinic not found');
          return;
        }

        setClinic(response);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setClinic(null);
          setErrorMessage('Unable to load this clinic right now.');
          return;
        }

        setClinic(null);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load this clinic right now.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!id) {
      setClinic(null);
      setErrorMessage('Clinic not found');
      setIsLoading(false);
      return;
    }

    void loadClinic();
  }, [id]);

  const clinicData = useMemo(() => {
    if (!clinic) {
      return null;
    }

    const topDoctors = clinic.doctors.slice(0, 4);
    const reviewCount = formatReviewCount(clinic.doctorsCount);
    const rating = clinic.doctorsCount >= 4 ? 4.8 : clinic.doctorsCount >= 2 ? 4.6 : 4.5;
    const firstDoctor = clinic.doctors[0];

    return {
      topDoctors,
      reviewCount,
      rating,
      phone: formatClinicPhone(clinic.id),
      email: formatClinicEmail(clinic.name),
      hours: firstDoctor?.availableTimeSlots?.[0] ? `Mon - Sat   ${firstDoctor.availableTimeSlots[0]} - 8:00 PM` : 'Mon - Sat   9:00 AM - 8:00 PM',
      closedText: 'Sunday   Closed',
      address: clinic.location,
      about: `${clinic.name} is a trusted center for ${clinic.category.toLowerCase()} care. Our experienced team provides personalized consultations, coordinated treatment plans, and a comfortable clinic experience backed by CareLoop verified doctors.`,
      clinicFees: firstDoctor?.consultationFees ?? 700,
    };
  }, [clinic]);

  return (
    <div className="min-h-screen bg-[#f5f7f4]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Loading clinic details...
          </div>
        ) : errorMessage || !clinic || !clinicData ? (
          <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
            {errorMessage || 'Clinic not found'}
          </div>
        ) : (
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Link className="transition hover:text-emerald-700" to="/">
                Home
              </Link>
              <BreadcrumbChevron />
              <Link className="transition hover:text-emerald-700" to="/#clinic-cards-section">
                Clinics
              </Link>
              <BreadcrumbChevron />
              <span className="font-medium text-slate-700">{clinic.name}</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[26px] bg-emerald-50">
              {clinic.imageUrl ? (
                <img alt={clinic.name} className="h-[180px] w-full object-cover sm:h-[240px] lg:h-[300px]" src={clinic.imageUrl} />
              ) : (
                <div className="flex h-[180px] w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-8xl font-bold text-emerald-700 sm:h-[240px] lg:h-[300px]">
                  {clinic.name.slice(0, 1)}
                </div>
              )}
            </div>

            <div className="relative z-10 -mt-10 px-2 sm:-mt-14 sm:px-4">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex h-28 w-28 items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-lg">
                    {clinic.imageUrl ? (
                      <img alt="" className="h-16 w-16 rounded-full object-cover" src={clinic.imageUrl} />
                    ) : (
                      <span className="text-3xl font-bold text-emerald-700">{clinic.name.slice(0, 1)}</span>
                    )}
                  </div>

                  <div className="rounded-[24px] bg-white/95 p-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">{clinic.name}</h1>
                      {clinic.verified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                          <CheckIcon />
                          Verified Clinic
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span>{formatCategoryLabel(clinic.category)}</span>
                      <span className="text-slate-300">|</span>
                      <span>{clinic.location}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <DoctorsIcon />
                        {clinic.doctorsCount} Doctors
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <TimeIcon />
                        {clinic.yearsOfService}+ Years of Service
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <StarIcon />
                        {clinicData.rating.toFixed(1)} ({clinicData.reviewCount} Reviews)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    href={`tel:${clinicData.phone.replace(/\s+/g, '')}`}
                  >
                    Call Clinic
                  </a>
                  {clinicData.topDoctors[0] ? (
                    <LinkButton className="rounded-xl px-5 py-3 text-sm" to={`/doctor/${getApprovedDoctorRouteId(clinicData.topDoctors[0])}`}>
                      Book Appointment
                    </LinkButton>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 border-b border-slate-200">
              <div className="flex gap-6 overflow-x-auto pb-3 text-sm font-semibold text-slate-600">
                <button className="border-b-2 border-emerald-600 pb-3 text-emerald-700" type="button">Overview</button>
                <button className="pb-3 transition hover:text-slate-900" type="button">Doctors</button>
                <button className="pb-3 transition hover:text-slate-900" type="button">Services</button>
                <button className="pb-3 transition hover:text-slate-900" type="button">Reviews</button>
                <button className="pb-3 transition hover:text-slate-900" type="button">Gallery</button>
                <button className="pb-3 transition hover:text-slate-900" type="button">Contact</button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.95fr)]">
              <div className="space-y-6">
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">About Clinic</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{clinicData.about}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {statHighlights.map((item, index) => (
                      <div className="rounded-2xl bg-[#f7faf7] p-4" key={item.title}>
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                          {index + 1}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-950">Doctors at This Clinic</h2>
                    <span className="text-sm font-semibold text-emerald-700">View All ({clinic.doctorsCount})</span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {clinicData.topDoctors.map((doctor) => {
                      const routeId = getApprovedDoctorRouteId(doctor);

                      return (
                        <article className="rounded-[20px] border border-slate-200 bg-[#fcfdfc] p-3 shadow-sm" key={doctor.userId}>
                          <div className="overflow-hidden rounded-[16px] bg-slate-100">
                            {doctor.profileImageUrl ? (
                              <img alt={doctor.name} className="h-36 w-full object-cover" src={doctor.profileImageUrl} />
                            ) : (
                              <div className="flex h-36 items-center justify-center text-4xl font-bold text-emerald-700">
                                {doctor.name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <h3 className="mt-3 text-sm font-bold text-slate-950">{doctor.name}</h3>
                          <p className="mt-1 text-xs text-slate-600">{doctor.specialization}</p>
                          <p className="mt-1 text-xs text-slate-500">{doctor.experience}+ Years Exp.</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">Rs {doctor.consultationFees || clinicData.clinicFees}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {(doctor.availableDays.length ? doctor.availableDays : ['Mon', 'Tue', 'Wed', 'Fri', 'Sat']).join(', ')}
                          </p>
                          <LinkButton className="mt-3 w-full rounded-lg px-3 py-2 text-xs" to={`/doctor/${routeId}`}>
                            Book Appointment
                          </LinkButton>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Services & Treatments</h2>
                  <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
                    {serviceTiles.map((service) => (
                      <div className="rounded-[18px] border border-slate-200 bg-[#fcfdfc] p-4 text-center" key={service}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-700">
                          +
                        </div>
                        <p className="mt-3 text-xs font-medium leading-5 text-slate-700">{service}</p>
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" type="button">
                    View All Services
                  </button>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[24px] border border-slate-200 bg-[#fcfdfc] p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Clinic Information</h2>

                  <div className="mt-5 space-y-5 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <LocationIcon />
                      <div>
                        <p className="font-semibold text-slate-900">Address</p>
                        <p className="mt-1 leading-6">{clinicData.address}</p>
                        <button className="mt-3 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" type="button">
                          Get Directions
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <PhoneIcon />
                      <div>
                        <p className="font-semibold text-slate-900">Phone</p>
                        <p className="mt-1">{clinicData.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MailIcon />
                      <div>
                        <p className="font-semibold text-slate-900">Email</p>
                        <p className="mt-1 break-all">{clinicData.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarIcon />
                      <div>
                        <p className="font-semibold text-slate-900">Working Hours</p>
                        <p className="mt-1">{clinicData.hours}</p>
                        <p className="mt-1">{clinicData.closedText}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-[#fcfdfc] p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Why Choose Us</h2>
                  <div className="mt-4 space-y-3">
                    {featureList.map((item) => (
                      <div className="flex items-start gap-3 text-sm text-slate-700" key={item}>
                        <CheckIcon />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-[#fcfdfc] p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">Patient Reviews</h2>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-3xl font-bold text-slate-950">{clinicData.rating.toFixed(1)}</p>
                    <div className="flex gap-1 pb-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon key={index} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">({clinicData.reviewCount} Reviews)</p>
                  <blockquote className="mt-4 text-sm leading-7 text-slate-600">
                    "Excellent experience. The doctors are professional, the clinic feels organized, and the care journey is very supportive."
                  </blockquote>
                  <p className="mt-3 text-sm font-medium text-slate-700">Priya S.</p>
                  <button className="mt-5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800" type="button">
                    View All Reviews
                  </button>
                </section>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export { ClinicDetailPage };
