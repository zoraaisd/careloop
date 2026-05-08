import axios from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '@/services/api';

type DoctorSignupResponse = {
  message: string;
};

type DoctorAdminForm = {
  name: string;
  email: string;
  clinicPhone: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  specialization: string;
  experience: string;
  qualification: string;
};

const emptyForm: DoctorAdminForm = {
  name: '',
  email: '',
  clinicPhone: '',
  clinicName: '',
  clinicAddress: '',
  city: '',
  specialization: '',
  experience: '',
  qualification: '',
};

const ensureDrPrefix = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/^Dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
};

const AddClinic = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<DoctorAdminForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const doctorName = ensureDrPrefix(form.name);

      const { data } = await apiClient.post<DoctorSignupResponse>('/admin/clinics/invite-doctor', {
        name: doctorName,
        email: form.email.trim(),
        clinicPhone: form.clinicPhone.trim(),
        specialization: form.specialization.trim(),
        experience: Number(form.experience),
        qualification: form.qualification.trim(),
        clinicName: form.clinicName.trim(),
        clinicAddress: form.clinicAddress.trim(),
        city: form.city.trim(),
        medicalRegistrationNumber: 'N/A',
        medicalCouncilBoard: 'N/A',
        dateOfBirth: '1970-01-01',
        availableDays: [],
        availableTimeSlots: [],
      });

      setSuccessMessage(data.message);
      setForm(emptyForm);
      window.setTimeout(() => navigate('/admin/clinics/all'), 1200);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string; details?: Array<{ field: string; constraints?: Record<string, string> }> }>(error)
        ? error.response?.data?.details?.[0]?.constraints
          ? Object.values(error.response.data.details[0].constraints)[0]
          : error.response?.data?.message ?? 'Unable to add clinic right now. Please try again.'
        : 'Unable to add clinic right now. Please try again.';

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400';

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Add Clinic</h3>
          <p className="mt-1 text-sm text-slate-500">Create a clinic account and fill in the associated doctor details.</p>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => navigate('/admin/clinics/all')}
          type="button"
        >
          Back to Clinic List
        </button>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-700">
          Doctor Name
          <div className="mt-1 flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">Dr.</span>
            <input
              className="w-full rounded-r-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter doctor name"
              required
              type="text"
              value={form.name}
            />
          </div>
        </label>

        <label className="text-sm text-slate-700">
          Email
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </label>

        <label className="text-sm text-slate-700">
          Clinic Contact Number
          <input
            className={`mt-1 ${inputClass}`}
            maxLength={10}
            onChange={(e) => setForm((prev) => ({ ...prev, clinicPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            placeholder="Enter 10-digit contact number"
            required
            type="tel"
            value={form.clinicPhone}
          />
        </label>

        <label className="text-sm text-slate-700">
          Clinic Name
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, clinicName: e.target.value }))}
            required
            type="text"
            value={form.clinicName}
          />
        </label>

        <label className="text-sm text-slate-700">
          City
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            required
            type="text"
            value={form.city}
          />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Clinic Address
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, clinicAddress: e.target.value }))}
            required
            type="text"
            value={form.clinicAddress}
          />
        </label>

        <label className="text-sm text-slate-700">
          Specialization
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
            required
            type="text"
            value={form.specialization}
          />
        </label>

        <label className="text-sm text-slate-700">
          Qualification
          <input
            className={`mt-1 ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, qualification: e.target.value }))}
            required
            type="text"
            value={form.qualification}
          />
        </label>

        <label className="text-sm text-slate-700">
          Experience
          <input
            className={`mt-1 ${inputClass}`}
            min={0}
            onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))}
            required
            type="number"
            value={form.experience}
          />
        </label>

        <button
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:col-span-2"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Adding Clinic...' : 'Add Clinic'}
        </button>

        {successMessage ? <p className="text-sm font-medium text-emerald-600 sm:col-span-2">{successMessage}</p> : null}
        {submitError ? <p className="text-sm font-medium text-rose-600 sm:col-span-2">{submitError}</p> : null}
      </form>
    </section>
  );
};

export { AddClinic };
