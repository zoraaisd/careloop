import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button, LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import {
  createPublicAppointment,
  getApprovedDoctorAvailability,
  getApprovedDoctorById,
  type ApprovedDoctor,
  type ApprovedDoctorAvailabilitySlot,
} from '@/services/public-doctors';

type BookingFormState = {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientAge: string;
  patientGender: string;
  slotId: string;
  notes: string;
};

const initialFormState: BookingFormState = {
  patientName: '',
  patientPhone: '',
  patientEmail: '',
  patientAge: '',
  patientGender: '',
  slotId: '',
  notes: '',
};

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

const BookAppointmentPage = () => {
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [slots, setSlots] = useState<ApprovedDoctorAvailabilitySlot[]>([]);
  const [form, setForm] = useState<BookingFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadBookingContext = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [doctorResponse, slotsResponse] = await Promise.all([
          getApprovedDoctorById(doctorId),
          getApprovedDoctorAvailability(doctorId),
        ]);

        setDoctor(doctorResponse);
        setSlots(slotsResponse);
        setForm((current) => ({
          ...current,
          slotId: current.slotId || slotsResponse[0]?.slotId || '',
        }));
      } catch {
        setErrorMessage('Unable to load this booking page right now.');
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorId) {
      void loadBookingContext();
    }
  }, [doctorId]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slotId === form.slotId) ?? null,
    [form.slotId, slots],
  );

  const handleChange =
    (field: keyof BookingFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let value = event.target.value;

      if (field === 'patientPhone') {
        value = value.replace(/\D/g, '').slice(0, 10);
      }

      if (field === 'patientAge') {
        value = value.replace(/\D/g, '').slice(0, 3);
      }

      setForm((current) => ({ ...current, [field]: value }));
      setErrorMessage('');
      setSuccessMessage('');
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.slotId) {
      setErrorMessage('Please choose an available appointment slot.');
      return;
    }

    if (!form.patientName.trim() || !form.patientPhone.trim() || !form.patientAge.trim()) {
      setErrorMessage('Please fill in your name, phone number, and age.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await createPublicAppointment(doctorId, {
        slotId: form.slotId,
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        patientEmail: form.patientEmail.trim() || undefined,
        patientAge: Number(form.patientAge),
        patientGender: form.patientGender.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setSuccessMessage(response.message);

      const freshSlots = await getApprovedDoctorAvailability(doctorId);
      setSlots(freshSlots);
      setForm({
        ...initialFormState,
        slotId: freshSlots[0]?.slotId || '',
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Unable to book the appointment right now.'
        : 'Unable to book the appointment right now.';

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-lg">
            Loading booking details...
          </div>
        ) : errorMessage && !doctor ? (
          <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-lg">
            {errorMessage}
          </div>
        ) : doctor ? (
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Book with doctor</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{doctor.name}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {doctor.specialization} · {doctor.qualification}
              </p>

              <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">{doctor.clinicName}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{doctor.clinicAddress}</p>
                <p className="mt-4 text-sm text-slate-700">Fees: {formatCurrency(doctor.consultationFees)}</p>
                <p className="mt-2 text-sm text-slate-700">City: {doctor.city}</p>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">Available slots</p>
                <div className="mt-4 space-y-3">
                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <label
                        className={[
                          'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition',
                          form.slotId === slot.slotId
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-emerald-200',
                        ].join(' ')}
                        key={slot.slotId}
                      >
                        <input
                          checked={form.slotId === slot.slotId}
                          className="mt-1 h-4 w-4 accent-[#16A34A]"
                          name="slotId"
                          onChange={() => setForm((current) => ({ ...current, slotId: slot.slotId }))}
                          type="radio"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{slot.day}</p>
                          <p className="mt-1 text-sm text-slate-600">{slot.date}</p>
                          <p className="mt-2 text-sm font-medium text-emerald-700">{slot.time}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No public slots are available for this doctor right now.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Patient details</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Confirm appointment</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Enter the patient details below and choose one available slot to create the appointment.
              </p>

              {selectedSlot ? (
                <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  Booking {selectedSlot.day}, {selectedSlot.date} at {selectedSlot.time}
                </div>
              ) : null}

              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Patient name</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('patientName')}
                    placeholder="Enter patient name"
                    value={form.patientName}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Phone number</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('patientPhone')}
                    placeholder="10-digit phone number"
                    value={form.patientPhone}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('patientEmail')}
                    placeholder="Optional email"
                    type="email"
                    value={form.patientEmail}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Age</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('patientAge')}
                    placeholder="Patient age"
                    value={form.patientAge}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Gender</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('patientGender')}
                    value={form.patientGender}
                  >
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                    onChange={handleChange('notes')}
                    placeholder="Share symptoms or booking notes"
                    value={form.notes}
                  />
                </label>

                {errorMessage ? (
                  <p className="text-sm font-medium text-rose-600 sm:col-span-2">{errorMessage}</p>
                ) : null}

                {successMessage ? (
                  <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:col-span-2">
                    {successMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                  <Button className="rounded-2xl px-6 py-3" disabled={isSubmitting || slots.length === 0} type="submit">
                    {isSubmitting ? 'Booking...' : 'Confirm booking'}
                  </Button>
                  <LinkButton className="rounded-2xl px-6 py-3" to={`/doctors/${doctor.userId}`} variant="secondary">
                    View profile
                  </LinkButton>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export { BookAppointmentPage };
