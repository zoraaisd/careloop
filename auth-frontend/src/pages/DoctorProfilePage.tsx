import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import {
  getApprovedDoctorById,
  getApprovedDoctorRouteId,
  resolvePublicDoctorId,
  type ApprovedDoctor,
} from '@/services/public-doctors';

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

const DoctorProfilePage = () => {
  const { id = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const bookingRouteId = doctor ? getApprovedDoctorRouteId(doctor) : '';

  useEffect(() => {
    const loadDoctor = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const resolvedDoctorId = await resolvePublicDoctorId(id);
        const response = await getApprovedDoctorById(resolvedDoctorId);
        setDoctor(response);
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
    setErrorMessage('Doctor not found');
    setIsLoading(false);
  }, [id]);

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
            {errorMessage || 'Doctor not found'}
          </div>
        ) : (
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Doctor profile</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
                <p className="mt-3 text-lg text-slate-600">{doctor.specialization}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinic</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{doctor.clinicName}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{doctor.clinicAddress}, {doctor.city}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Consultation</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(doctor.consultationFees)}</p>
                    <p className="mt-2 text-sm text-slate-600">{doctor.experience}+ years of experience</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About doctor</p>
                  <p className="mt-3 text-sm leading-8 text-slate-600">
                    {doctor.aboutDoctor || `${doctor.name} is available for consultation at ${doctor.clinicName}.`}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f4fff8_100%)] p-6 shadow-lg shadow-emerald-100/40">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Visit summary</p>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">Quick profile snapshot</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This page now pulls the selected doctor from the public approved-doctors API and shows the full profile with real backend data.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Name</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{doctor.name}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Specialization</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{doctor.specialization}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinic</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{doctor.clinicName}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fees</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{formatCurrency(doctor.consultationFees)}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <LinkButton className="rounded-2xl px-6 py-3" fullWidth to="/">
                    Back to doctors
                  </LinkButton>
                  <LinkButton className="rounded-2xl px-6 py-3" fullWidth to={`/doctors/${bookingRouteId}/book`}>
                    Book appointment
                  </LinkButton>
                  <LinkButton className="rounded-2xl px-6 py-3" fullWidth to="/login" variant="secondary">
                    Login
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
