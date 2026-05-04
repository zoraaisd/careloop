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
const DoctorProfilePage = () => {
  const { id = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'experience' | 'education' | 'reviews'>('about');
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const bookingRouteId = doctor ? getApprovedDoctorRouteId(doctor) : '';

  useEffect(() => {
    const loadDoctor = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setReviews([]);

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
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 pt-4 shadow-md shadow-slate-200/40 sm:px-5 sm:pt-5">
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900" to="/">
                <span aria-hidden="true">&larr;</span>
                <span>Back to doctors</span>
              </Link>
            </div>

            <div className="grid items-start gap-5 p-4 pt-3 sm:p-5 lg:grid-cols-[1.45fr_0.95fr]">
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
                    <span className="inline-flex rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      Verified Doctor
                    </span>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
                    <p className="mt-1.5 text-2xl font-semibold text-blue-700">{doctor.specialization}</p>
                    <p className="mt-2 text-base text-slate-600">
                      {doctor.qualification || 'Qualified specialist'}{doctor.clinicName ? ` - ${doctor.clinicName}` : ''}
                    </p>
                    <p className="mt-1 text-base text-slate-600">{doctor.experience}+ Years of Experience</p>

                    <div className="mt-4 border-y border-slate-200 py-4">
                      <p className="text-3xl font-bold text-slate-900">{doctor.patientCount}+</p>
                      <p className="text-sm text-slate-500">Patients Treated</p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-base leading-7 text-slate-700">
                  {doctor.aboutDoctor || `${doctor.name} is available for consultation at ${doctor.clinicName}.`}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    className="text-sm font-semibold text-slate-700 transition hover:text-slate-900 sm:ml-auto"
                    state={{ doctorName: doctor.name }}
                    to={`/doctors/${bookingRouteId || id}/review`}
                  >
                    Review &rarr;
                  </Link>
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
                    <Link
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                      key={day}
                      to={`/doctors/${bookingRouteId}/book#slot-section`}
                    >
                      {day}
                    </Link>
                  ))}
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Choose Time</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(doctor.availableTimeSlots.length ? doctor.availableTimeSlots : ['10:00 AM', '6:00 PM']).map((slot) => (
                    <Link
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      key={slot}
                      to={`/doctors/${bookingRouteId}/book#slot-section`}
                    >
                      {slot}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40 sm:p-5">
              <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4 text-sm font-semibold text-slate-600">
                <button className={`rounded-lg px-4 py-2 ${activeTab === 'about' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => setActiveTab('about')} type="button">About</button>
                <button className={`rounded-lg px-4 py-2 ${activeTab === 'experience' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => setActiveTab('experience')} type="button">Experience</button>
                <button className={`rounded-lg px-4 py-2 ${activeTab === 'education' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => setActiveTab('education')} type="button">Education</button>
                <button className={`rounded-lg px-4 py-2 ${activeTab === 'reviews' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => setActiveTab('reviews')} type="button">Reviews</button>
              </div>

              {activeTab === 'reviews' ? (
                <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-slate-600">No reviews submitted yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <article className="rounded-xl border border-slate-200 p-4" key={review.id}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                            <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{review.experienceStory}</p>
                          <p className="mt-2 text-xs text-slate-500">Visited for: {review.healthProblem} | Wait: {review.waitTime}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'experience' ? (
                <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-2xl font-semibold text-slate-900">Experience</h2>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {Number.isFinite(doctor.experience) ? doctor.experience : 0}+ Years of Professional Experience
                  </p>
                </div>
              ) : activeTab === 'education' ? (
                <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-2xl font-semibold text-slate-900">Education & Qualification</h2>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {doctor.qualification || 'Qualification details not provided.'}
                  </p>
                </div>
              ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-2xl font-semibold text-slate-900">About {doctor.name}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {doctor.aboutDoctor || `${doctor.name} is a trusted ${doctor.specialization.toLowerCase()} specialist.`}
                  </p>
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <h3 className="text-2xl font-semibold text-slate-900">Expertise</h3>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{doctor.specialization}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Location</p>
                      <p className="mt-1.5 text-base text-slate-700">{doctor.clinicAddress || doctor.clinicName}, {doctor.city || 'India'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Consultation Fees</p>
                      <p className="mt-1.5 text-base text-slate-700">{formatCurrency(doctor.consultationFees)}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Availability</p>
                      <p className="mt-1.5 text-base text-slate-700">
                        {(doctor.availableDays.length ? doctor.availableDays.join(', ') : 'Mon - Sat')}
                        {' | '}
                        {(doctor.availableTimeSlots.length ? doctor.availableTimeSlots.join(' | ') : '10:00 AM - 6:00 PM')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export { DoctorProfilePage };
