import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import { getApprovedDoctorAvailability, getApprovedDoctorById, type ApprovedDoctor, type ApprovedDoctorAvailabilitySlot } from '@/services/public-doctors';

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

const DoctorProfilePage = () => {
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [slots, setSlots] = useState<ApprovedDoctorAvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadDoctor = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [doctorResponse, slotsResponse] = await Promise.all([
          getApprovedDoctorById(doctorId),
          getApprovedDoctorAvailability(doctorId),
        ]);

        setDoctor(doctorResponse);
        setSlots(slotsResponse);
      } catch {
        setErrorMessage('Unable to load this doctor profile right now.');
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorId) {
      void loadDoctor();
    }
  }, [doctorId]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-lg">
            Loading doctor profile...
          </div>
        ) : errorMessage || !doctor ? (
          <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-lg">
            {errorMessage || 'Doctor profile not found.'}
          </div>
        ) : (
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Approved doctor</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
                <p className="mt-3 text-lg text-slate-600">
                  {doctor.specialization} · {doctor.qualification}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinic</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{doctor.clinicName}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{doctor.clinicAddress}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Consultation</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(doctor.consultationFees)}</p>
                    <p className="mt-2 text-sm text-slate-600">{doctor.experience}+ years of experience</p>
                    <p className="mt-1 text-sm text-slate-600">{doctor.city}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About doctor</p>
                  <p className="mt-3 text-sm leading-8 text-slate-600">
                    {doctor.aboutDoctor || `${doctor.name} is available for consultation at ${doctor.clinicName}.`}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Available days</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{doctor.availableDays.join(', ') || 'Not specified'}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Typical slots</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{doctor.availableTimeSlots.join(', ') || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f4fff8_100%)] p-6 shadow-lg shadow-emerald-100/40">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Next available slots</p>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">Plan your consultation</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Review this doctor’s public profile and continue to the booking page to confirm an available slot.
                </p>

                <div className="mt-6 space-y-3">
                  {slots.length > 0 ? (
                    slots.slice(0, 6).map((slot) => (
                      <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3" key={slot.slotId}>
                        <p className="text-sm font-semibold text-slate-900">{slot.day}</p>
                        <p className="mt-1 text-sm text-slate-600">{slot.date}</p>
                        <p className="mt-2 text-sm font-medium text-emerald-700">{slot.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      No public slots are available yet for this doctor.
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <LinkButton className="rounded-2xl px-6 py-3" fullWidth to={`/doctors/${doctor.userId}/book`}>
                    Book appointment
                  </LinkButton>
                  <LinkButton className="rounded-2xl px-6 py-3" fullWidth to="/" variant="secondary">
                    Back to doctors
                  </LinkButton>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export { DoctorProfilePage };
