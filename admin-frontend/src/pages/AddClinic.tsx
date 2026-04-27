import axios from 'axios';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '@/services/api';

type DoctorSignupResponse = {
  token: string;
  role: 'doctor';
  userId: string;
  message: string;
};

type DoctorAdminForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  specialization: string;
  experience: string;
  qualification: string;
  consultationFees: string;
  availableDays: string[];
  availableTimeSlots: string[];
  medicalRegistrationNumber: string;
  medicalCouncilBoard: string;
  dateOfBirth: string;
  aboutDoctor: string;
  profileImageUrl: string;
  certificateUrl: string;
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const medicalCouncilBoards = [
  'Andhra Pradesh Medical Council',
  'Arunachal Pradesh Medical Council',
  'Assam Medical Council',
  'Bihar Medical Council',
  'Chandigarh Medical Council',
  'Chhattisgarh Medical Council',
  'Delhi Medical Council',
  'Goa Medical Council',
  'Gujarat Medical Council',
  'Haryana Medical Council',
  'Himachal Pradesh Medical Council',
  'Jammu & Kashmir Medical Council',
  'Jharkhand Medical Council',
  'Karnataka Medical Council',
  'Kerala State Medical Council',
  'Madhya Pradesh Medical Council',
  'Maharashtra Medical Council',
  'Manipur Medical Council',
  'Meghalaya Medical Council',
  'Mizoram Medical Council',
  'Nagaland Medical Council',
  'Odisha Council of Medical Registration',
  'Pondicherry Medical Council',
  'Punjab Medical Council',
  'Rajasthan Medical Council',
  'Sikkim Medical Council',
  'Tamil Nadu Medical Council',
  'Telangana State Medical Council',
  'Tripura State Medical Council',
  'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council',
  'West Bengal Medical Council',
] as const;

const emptyForm: DoctorAdminForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  clinicName: '',
  clinicAddress: '',
  city: '',
  specialization: '',
  experience: '',
  qualification: '',
  consultationFees: '',
  availableDays: [],
  availableTimeSlots: [],
  medicalRegistrationNumber: '',
  medicalCouncilBoard: '',
  dateOfBirth: '',
  aboutDoctor: '',
  profileImageUrl: '',
  certificateUrl: '',
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

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Days dropdown
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const daysRef = useRef<HTMLDivElement>(null);

  // Time slot entry
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');

  // Profile image file name for display
  const [profileFileName, setProfileFileName] = useState('');

  // Close days dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (daysRef.current && !daysRef.current.contains(e.target as Node)) {
        setIsDaysOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const addTimeSlot = () => {
    if (!slotStart || !slotEnd) return;
    const slot = `${slotStart} - ${slotEnd}`;
    setForm((prev) => ({
      ...prev,
      availableTimeSlots: [...prev.availableTimeSlots, slot],
    }));
    setSlotStart('');
    setSlotEnd('');
  };

  const removeTimeSlot = (index: number) => {
    setForm((prev) => ({
      ...prev,
      availableTimeSlots: prev.availableTimeSlots.filter((_, i) => i !== index),
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profileImageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const doctorName = ensureDrPrefix(form.name);

      await apiClient.post<DoctorSignupResponse>('/auth/signup', {
        name: doctorName,
        email: form.email.trim(),
        phone: '',
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: 'doctor',
        signupVerificationToken: '',
        doctorProfile: {
          specialization: form.specialization.trim(),
          experience: Number(form.experience),
          qualification: form.qualification.trim(),
          clinicName: form.clinicName.trim(),
          clinicAddress: form.clinicAddress.trim(),
          city: form.city.trim(),
          consultationFees: Number(form.consultationFees),
          availableDays: form.availableDays,
          availableTimeSlots: form.availableTimeSlots,
          aboutDoctor: form.aboutDoctor.trim() || undefined,
          profileImageUrl: form.profileImageUrl.trim() || undefined,
          certificateUrl: form.certificateUrl.trim() || undefined,
          medicalRegistrationNumber: form.medicalRegistrationNumber.trim(),
          medicalCouncilBoard: form.medicalCouncilBoard.trim(),
          councilRegisteredName: '',
          dateOfBirth: form.dateOfBirth,
        },
      });

      navigate('/admin/doctors');
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string; details?: Array<{ field: string; constraints?: Record<string, string> }> }>(error)
        ? error.response?.data?.details?.[0]?.constraints
          ? Object.values(error.response.data.details[0].constraints)[0]
          : error.response?.data?.message ?? 'Unable to add doctor right now. Please try again.'
        : 'Unable to add doctor right now. Please try again.';

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
          <h3 className="text-2xl font-semibold text-slate-900">Add Doctor</h3>
          <p className="mt-1 text-sm text-slate-500">Create a doctor account with the same details used in doctor signup.</p>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => navigate('/admin/doctors')}
          type="button"
        >
          Back to Doctor List
        </button>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        {/* Doctor Name with Dr. prefix */}
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

        {/* Email - simple input without verify */}
        <label className="text-sm text-slate-700">
          Email
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required type="email" value={form.email} />
        </label>

        {/* Password with visibility toggle */}
        <label className="text-sm text-slate-700">
          Password
          <div className="relative mt-1">
            <input
              className={inputClass + ' pr-10'}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              type={showPassword ? 'text' : 'password'}
              value={form.password}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              type="button"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
        </label>

        {/* Confirm Password with visibility toggle */}
        <label className="text-sm text-slate-700">
          Confirm Password
          <div className="relative mt-1">
            <input
              className={inputClass + ' pr-10'}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
              type={showConfirmPassword ? 'text' : 'password'}
              value={form.confirmPassword}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              onClick={() => setShowConfirmPassword((v) => !v)}
              tabIndex={-1}
              type="button"
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
        </label>

        <label className="text-sm text-slate-700">
          Clinic Name
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, clinicName: e.target.value }))} required type="text" value={form.clinicName} />
        </label>

        <label className="text-sm text-slate-700">
          City
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} required type="text" value={form.city} />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Clinic Address
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, clinicAddress: e.target.value }))} required type="text" value={form.clinicAddress} />
        </label>

        <label className="text-sm text-slate-700">
          Specialization
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} required type="text" value={form.specialization} />
        </label>

        <label className="text-sm text-slate-700">
          Qualification
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, qualification: e.target.value }))} required type="text" value={form.qualification} />
        </label>

        <label className="text-sm text-slate-700">
          Experience
          <input className={`mt-1 ${inputClass}`} min={0} onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))} required type="number" value={form.experience} />
        </label>

        <label className="text-sm text-slate-700">
          Consultation Fees
          <input className={`mt-1 ${inputClass}`} min={0} onChange={(e) => setForm((prev) => ({ ...prev, consultationFees: e.target.value }))} required type="number" value={form.consultationFees} />
        </label>

        {/* Available Days - Checkbox Dropdown */}
        <div className="text-sm text-slate-700" ref={daysRef}>
          Available Days
          <div className="relative mt-1">
            <button
              className={`${inputClass} flex min-h-[42px] cursor-pointer flex-wrap items-center gap-1 text-left`}
              onClick={() => setIsDaysOpen((v) => !v)}
              type="button"
            >
              {form.availableDays.length > 0 ? (
                form.availableDays.map((day) => (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700" key={day}>
                    {day.slice(0, 3)}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">Select days</span>
              )}
            </button>
            {isDaysOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {WEEK_DAYS.map((day) => (
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-emerald-50" key={day}>
                    <input
                      checked={form.availableDays.includes(day)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                      onChange={() => toggleDay(day)}
                      type="checkbox"
                    />
                    {day}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Time Slots - Start/End time with slot management */}
        <div className="text-sm text-slate-700">
          Available Time Slots
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
                onChange={(e) => setSlotStart(e.target.value)}
                type="time"
                value={slotStart}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
                onChange={(e) => setSlotEnd(e.target.value)}
                type="time"
                value={slotEnd}
              />
              <button
                className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                disabled={!slotStart || !slotEnd}
                onClick={addTimeSlot}
                type="button"
              >
                Add
              </button>
            </div>
            {form.availableTimeSlots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.availableTimeSlots.map((slot, idx) => (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" key={idx}>
                    {slot}
                    <button
                      className="ml-0.5 text-emerald-400 transition hover:text-rose-500"
                      onClick={() => removeTimeSlot(idx)}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <label className="text-sm text-slate-700">
          Council Code
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, medicalRegistrationNumber: e.target.value }))} required type="text" value={form.medicalRegistrationNumber} />
        </label>

        <label className="text-sm text-slate-700">
          DOB
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} required type="date" value={form.dateOfBirth} />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Council Board
          <select className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, medicalCouncilBoard: e.target.value }))} required value={form.medicalCouncilBoard}>
            <option value="">Select council board</option>
            {medicalCouncilBoards.map((board) => (
              <option key={board} value={board}>
                {board}
              </option>
            ))}
          </select>
        </label>

        {/* About Doctor - fixed height, not resizable */}
        <label className="text-sm text-slate-700 sm:col-span-2">
          About Doctor
          <textarea
            className={`mt-1 h-28 resize-none ${inputClass}`}
            onChange={(e) => setForm((prev) => ({ ...prev, aboutDoctor: e.target.value }))}
            value={form.aboutDoctor}
          />
        </label>

        {/* Profile Image URL with local upload option */}
        <label className="text-sm text-slate-700">
          Profile Image
          <div className="mt-1 flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              onChange={(e) => { setForm((prev) => ({ ...prev, profileImageUrl: e.target.value })); setProfileFileName(''); }}
              placeholder="Enter URL or upload"
              type="text"
              value={profileFileName || form.profileImageUrl}
            />
            <label className="inline-flex shrink-0 cursor-pointer items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Upload
              <input accept="image/*" className="hidden" onChange={handleImageUpload} type="file" />
            </label>
          </div>
        </label>

        <label className="text-sm text-slate-700">
          Certificate URL
          <input className={`mt-1 ${inputClass}`} onChange={(e) => setForm((prev) => ({ ...prev, certificateUrl: e.target.value }))} type="text" value={form.certificateUrl} />
        </label>

        <button
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:col-span-2"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Adding Doctor...' : 'Add Doctor'}
        </button>

        {successMessage ? <p className="text-sm font-medium text-emerald-600 sm:col-span-2">{successMessage}</p> : null}
        {submitError ? <p className="text-sm font-medium text-rose-600 sm:col-span-2">{submitError}</p> : null}
      </form>
    </section>
  );
};

export { AddClinic };
