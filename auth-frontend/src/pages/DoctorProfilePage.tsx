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
            <div className="mx-auto max-w-4xl">
              <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Doctor profile</p>
              <div className="mt-4 flex justify-center">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {doctor.experience}+ years experience
                </span>
              </div>
              <div className="mt-5 flex justify-center">
                <div className="h-28 w-28 overflow-hidden rounded-full border border-emerald-100 bg-emerald-50">
                  {doctor.profileImageUrl ? (
                    <img alt={doctor.name} className="h-full w-full object-cover" src={doctor.profileImageUrl} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-emerald-700">
                      {doctor.name.slice(0, 1)}
                    </div>
                  )}
                </div>
              </div>

              <h1 className="mt-4 text-center text-4xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
              <p className="mt-2 text-center text-lg font-semibold text-emerald-700">{doctor.specialization}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinic</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{doctor.clinicName}</p>
                  <p className="mt-1 text-sm text-slate-600">{doctor.clinicAddress}, {doctor.city}</p>
                </div>
                <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Consultation Fee</p>
                  <p className="mt-2 text-base font-semibold text-emerald-700">{formatCurrency(doctor.consultationFees)}</p>
                  <p className="mt-1 text-sm text-slate-600">{doctor.qualification || 'Qualified specialist'}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[20px] border border-slate-100 bg-slate-50 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About doctor</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {doctor.aboutDoctor || `${doctor.name} is available for consultation at ${doctor.clinicName}.`}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
          </section>
        )}
      </main>
    </div>
  );
};

export { DoctorProfilePage };
