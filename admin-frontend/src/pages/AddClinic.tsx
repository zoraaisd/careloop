import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { createClinic } from '@/services/admin';

type ClinicForm = {
  clinicName: string;
  ownerName: string;
  address: string;
  contact: string;
  subscriptionPlan: string;
  doctors: string;
  patients: string;
  status: string;
};

const emptyForm: ClinicForm = {
  clinicName: '',
  ownerName: '',
  address: '',
  contact: '',
  subscriptionPlan: '',
  doctors: '',
  patients: '',
  status: 'Active',
};

const AddClinic = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ClinicForm>(emptyForm);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createClinic({
      clinicName: form.clinicName,
      ownerName: form.ownerName,
      address: form.address,
      contact: form.contact,
      subscriptionPlan: form.subscriptionPlan,
      doctors: Number(form.doctors),
      patients: Number(form.patients),
      status: form.status as 'Active' | 'Pending Approval' | 'Suspended',
    });
    navigate('/admin/clinics/all');
  };

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Add Clinic</h3>
          <p className="mt-1 text-sm text-slate-500">Enter clinic details to create a new clinic profile.</p>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => navigate('/admin/clinics/all')}
          type="button"
        >
          Back to All Clinics
        </button>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-700">
          Clinic Name
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, clinicName: event.target.value }))}
            required
            type="text"
            value={form.clinicName}
          />
        </label>

        <label className="text-sm text-slate-700">
          Owner Name
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
            required
            type="text"
            value={form.ownerName}
          />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Address
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            required
            type="text"
            value={form.address}
          />
        </label>

        <label className="text-sm text-slate-700">
          Contact Number
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
            required
            type="text"
            value={form.contact}
          />
        </label>

        <label className="text-sm text-slate-700">
          Subscription Plan
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, subscriptionPlan: event.target.value }))}
            required
            type="text"
            value={form.subscriptionPlan}
          />
        </label>

        <label className="text-sm text-slate-700">
          Number of Doctors
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            min={0}
            onChange={(event) => setForm((current) => ({ ...current, doctors: event.target.value }))}
            required
            type="number"
            value={form.doctors}
          />
        </label>

        <label className="text-sm text-slate-700">
          Number of Patients
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            min={0}
            onChange={(event) => setForm((current) => ({ ...current, patients: event.target.value }))}
            required
            type="number"
            value={form.patients}
          />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Status
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-400"
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            required
            value={form.status}
          >
            <option value="Active">Active</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Suspended">Suspended</option>
          </select>
        </label>

        <button
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:col-span-2"
          type="submit"
        >
          Add Clinic
        </button>
      </form>
    </section>
  );
};

export { AddClinic };
