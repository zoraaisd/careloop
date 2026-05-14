import axios from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '@/services/api';

type DoctorSignupResponse = {
  message: string;
  temporaryPassword?: string;
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
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [signupVerificationToken, setSignupVerificationToken] = useState('');

  const handleRequestOtp = async () => {
    if (!form.email || !form.clinicPhone || !form.name) {
      setSubmitError('Please fill in the basic doctor details first.');
      return;
    }
    setSubmitError('');
    setIsSendingOtp(true);
    try {
      await apiClient.post('/admin/clinics/request-otp', {
        email: form.email.trim(),
        phone: form.clinicPhone.trim(),
        name: ensureDrPrefix(form.name),
      });
      setOtpRequested(true);
      setSuccessMessage('Authorization OTP sent to Main Doctor (vinisha.codes@gmail.com)');
    } catch (error) {
      setSubmitError('Failed to send authorization OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setSubmitError('Please enter the OTP.');
      return;
    }
    setSubmitError('');
    setIsVerifyingOtp(true);
    try {
      const { data } = await apiClient.post<{ signupVerificationToken: string }>('/admin/clinics/verify-otp', {
        email: form.email.trim(),
        phone: form.clinicPhone.trim(),
        otp: otp.trim(),
      });
      setSignupVerificationToken(data.signupVerificationToken);
      setSuccessMessage('OTP verified successfully. You can now add the clinic.');
    } catch (error) {
      setSubmitError('Invalid OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signupVerificationToken) {
      setSubmitError('Please request and verify the authorization OTP first.');
      return;
    }
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
        signupVerificationToken,
      });

      setSuccessMessage(
        data.temporaryPassword
          ? `${data.message} Temporary password: ${data.temporaryPassword}`
          : data.message,
      );
      setForm(emptyForm);
      setSignupVerificationToken('');
      setOtp('');
      setOtpRequested(false);
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
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value.replace(/[0-9]/g, '') }))}
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
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value.replace(/[^a-zA-Z0-9@.]/g, '') }))}
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
          Experience (Years)
          <input
            className={`mt-1 ${inputClass}`}
            min={0}
            onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value.replace(/\D/g, '') }))}
            required
            type="text"
            value={form.experience}
          />
        </label>

        <div className="border-t border-slate-100 pt-5 sm:col-span-2">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Security Authorization</h4>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm text-slate-700">
                Main Doctor OTP (Authorize creation)
                <input
                  className={`mt-1 ${inputClass} ${signupVerificationToken ? 'bg-emerald-50 border-emerald-200' : ''}`}
                  disabled={!otpRequested || !!signupVerificationToken}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  type="text"
                  value={otp}
                />
              </label>
            </div>
            
            {!signupVerificationToken ? (
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  disabled={isSendingOtp}
                  onClick={handleRequestOtp}
                  type="button"
                >
                  {isSendingOtp ? 'Sending...' : otpRequested ? 'Resend OTP' : 'Request OTP'}
                </button>
                {otpRequested && (
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    disabled={isVerifyingOtp || !otp}
                    onClick={handleVerifyOtp}
                    type="button"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Authorized
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">
            Authorization OTP will be sent to <strong>vinisha.codes@gmail.com</strong>
          </p>
        </div>

        <button
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:col-span-2"
          disabled={isSubmitting || !signupVerificationToken}
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
