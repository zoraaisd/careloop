import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@/services/api';

type AddDoctorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string | undefined;
};

export const AddDoctorModal: React.FC<AddDoctorModalProps> = ({ isOpen, onClose, clinicId }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    experience: '',
    qualification: '',
    medicalRegistrationNumber: '',
    medicalCouncilBoard: '',
    councilRegisteredName: '',
    dateOfBirth: '',
    consultationFees: '',
    availableDays: 'Monday, Tuesday, Wednesday, Thursday, Friday',
    availableTimeSlots: '09:00 AM - 01:00 PM, 02:00 PM - 06:00 PM',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!clinicId) {
      setError('Your profile does not have a clinic ID yet. Please contact admin.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/doctor/invite', {
        ...form,
        experience: Number(form.experience),
        consultationFees: Number(form.consultationFees),
        clinicId,
      });
      alert('Doctor invited successfully!');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Doctor to Clinic</h2>
            <p className="text-sm text-slate-500">Clinic ID: {clinicId}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input required value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</label>
              <input required type="date" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input required type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
              <input required type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Specialization</label>
              <input required value={form.specialization} onChange={(e) => updateField('specialization', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Qualification</label>
              <input required value={form.qualification} onChange={(e) => updateField('qualification', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Experience (Years)</label>
              <input required type="number" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Consultation Fees</label>
              <input required type="number" value={form.consultationFees} onChange={(e) => updateField('consultationFees', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Council Code</label>
              <input required value={form.medicalRegistrationNumber} onChange={(e) => updateField('medicalRegistrationNumber', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Council Board</label>
              <input required value={form.medicalCouncilBoard} onChange={(e) => updateField('medicalCouncilBoard', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Council Name</label>
              <input required value={form.councilRegisteredName} onChange={(e) => updateField('councilRegisteredName', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
