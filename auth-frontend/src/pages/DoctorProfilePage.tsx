import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Navbar } from '@/components/Navbar';
import {
  getApprovedDoctorById,
  getApprovedDoctorRouteId,
  getDoctorReviews,
  resolvePublicDoctorId,
  type ApprovedDoctor,
  type DoctorReview,
} from '@/services/public-doctors';

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;
type ProfileSectionTab = 'about' | 'reviews' | 'clinic-photos';

const DoctorProfilePage = () => {
  const { id = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>('about');
  const bookingRouteId = doctor ? getApprovedDoctorRouteId(doctor) : '';

  useEffect(() => {
    const loadDoctor = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setReviews([]);
      setSelectedDay('');
      setSelectedTime('');
      setActiveTab('about');

      try {
        const resolvedDoctorId = await resolvePublicDoctorId(id);
        const doctorResponse = await getApprovedDoctorById(resolvedDoctorId);
        setDoctor(doctorResponse);
        const reviewsResponse = await getDoctorReviews(resolvedDoctorId);
        setReviews(reviewsResponse);
      } catch (error) {
        if (axios.isAxiosError<{ message?: string }>(error) && error.response?.status === 404) {
          setDoctor(null);
          setErrorMessage('Doctor not found');
        } else if (!axios.isAxiosError(error) && error instanceof Error) {
          setDoctor(null);
          setErrorMessage('Doctor not found');
        } else {
          setDoctor(null);
          setErrorMessage('Unable to load this doctor profile right now.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      void loadDoctor();
      return;
    }

    setDoctor(null);
    setReviews([]);
    setErrorMessage('Doctor not found');
    setIsLoading(false);
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-lg">
            Loading doctor profile...
          </div>
        ) : errorMessage || !doctor ? (
          <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-lg">
            {errorMessage || 'Doctor not found'}
          </div>
        ) : (
          <section className="space-y-5">
            <div className="px-1">
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900" to="/">
                <span aria-hidden="true">&larr;</span>
                <span>Back to doctors</span>
              </Link>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-[1.45fr_0.95fr]">
              <div className="order-1 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-[0.95fr_1.25fr]">
                  <div className="relative overflow-hidden rounded-[20px] bg-slate-100">
                    {doctor.profileImageUrl ? (
                      <img alt={doctor.name} className="h-full min-h-[250px] w-full object-cover" src={doctor.profileImageUrl} />
                    ) : (
                      <div className="flex h-full min-h-[250px] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-7xl font-bold text-slate-400">
                        {doctor.name.slice(0, 1)}
                      </div>
                    )}
                    <span className="absolute bottom-4 left-4 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-600">
                      Available
                    </span>
                  </div>

                  <div>
                    <span className="inline-flex rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Verified Doctor
                    </span>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
                    <p className="mt-1.5 text-2xl font-semibold text-emerald-700">{doctor.specialization}</p>
                    <p className="mt-2 text-base text-slate-600">
                      {doctor.qualification || 'Qualified specialist'}{doctor.clinicName ? ` - ${doctor.clinicName}` : ''}
                    </p>
                    <p className="mt-1 text-base text-slate-600">{doctor.experience}+ Years of Experience</p>

                    <div className="mt-4 border-y border-slate-200 py-4">
                      <p className="text-3xl font-bold text-slate-900">{doctor.patientCount}+</p>
                      <p className="text-sm text-slate-500">Patients Treated</p>
                    </div>
                    <Link
                      className="mt-3 inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                      state={{ doctorName: doctor.name }}
                      to={`/doctors/${bookingRouteId || id}/review`}
                    >
                      Review &rarr;
                    </Link>
                  </div>
                </div>

              </div>

              <div className="order-2 rounded-[20px] border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-20">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <p className="text-base font-semibold text-slate-900">Clinic Appointment</p>
                  <p className="text-base font-bold text-slate-900">{formatCurrency(doctor.consultationFees)}</p>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{doctor.clinicName}</p>
                <p className="mt-1 text-sm text-slate-600">{doctor.clinicAddress || doctor.city || 'India'}</p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Choose Day</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(doctor.availableDays.length ? doctor.availableDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => (
                    <button
                      className={[
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                        selectedDay === day
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
                      ].join(' ')}
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      type="button"
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Choose Time</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(doctor.availableTimeSlots.length ? doctor.availableTimeSlots : ['10:00 AM', '6:00 PM']).map((slot) => (
                    <button
                      className={[
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                        selectedTime === slot
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
                      ].join(' ')}
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      type="button"
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                <Link
                  className={[
                    'mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    selectedDay && selectedTime
                      ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                      : 'pointer-events-none bg-slate-200 text-slate-500',
                  ].join(' ')}
                  state={{ selectedDay, selectedTime }}
                  to={`/doctors/${bookingRouteId || id}/book#slot-section`}
                >
                  Book Appointment
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
                <button
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-semibold transition',
                    activeTab === 'about' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                  onClick={() => setActiveTab('about')}
                  type="button"
                >
                  About
                </button>
                <button
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-semibold transition',
                    activeTab === 'reviews' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                  onClick={() => setActiveTab('reviews')}
                  type="button"
                >
                  Reviews
                </button>
                <button
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-semibold transition',
                    activeTab === 'clinic-photos' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                  onClick={() => setActiveTab('clinic-photos')}
                  type="button"
                >
                  Clinic Photos
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                {activeTab === 'about' ? (
                  <>
                    <h2 className="text-2xl font-bold text-slate-900">About {doctor.name}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {doctor.aboutDoctor?.trim() || `${doctor.name} is a trusted specialist at ${doctor.clinicName}.`}
                    </p>
                    <div className="mt-5 border-t border-slate-200 pt-5">
                      <h3 className="text-2xl font-bold text-slate-900">Expertise</h3>
                      <span className="mt-3 inline-flex rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        {doctor.specialization}
                      </span>
                    </div>
                  </>
                ) : null}

                {activeTab === 'reviews' ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold text-slate-900">Patient Reviews</h2>
                      <Link
                        className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        state={{ doctorName: doctor.name }}
                        to={`/doctors/${bookingRouteId || id}/review`}
                      >
                        Add Review
                      </Link>
                    </div>
                    <div className="mt-5 p-2">
                      {reviews.length === 0 ? (
                        <p className="text-sm text-slate-600">No reviews submitted yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map((review) => (
                            <article className="rounded-xl border border-slate-200 p-4" key={review.id}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                                  <span className="text-xs text-amber-500">{'★'.repeat(Math.max(1, Math.min(5, review.starRating || 0)))}</span>
                                </div>
                                <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('en-IN')}</p>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">{review.experienceStory}</p>
                              <p className="mt-2 text-xs text-slate-500">Visited for: {review.healthProblem} | Wait: {review.waitTime}</p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {activeTab === 'clinic-photos' ? (
                  <>
                    <h2 className="text-xl font-semibold text-slate-900">Clinic Photos</h2>
                    <div className="mt-5">
                      {doctor.clinicImageUrl ? (
                        <img
                          alt={`${doctor.clinicName} clinic`}
                          className="h-72 w-full rounded-xl object-cover"
                          src={doctor.clinicImageUrl}
                        />
                      ) : (
                        <p className="text-sm text-slate-600">Clinic photo is not available yet.</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export { DoctorProfilePage };
