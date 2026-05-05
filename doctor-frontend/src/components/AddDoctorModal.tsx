import React, { useState } from 'react';
import { apiClient } from '@/services/api';
import axios from 'axios';

type AddDoctorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string | undefined;
};

export const AddDoctorModal: React.FC<AddDoctorModalProps> = ({ isOpen, onClose, clinicId }) => {
  const otpVerificationPhone = '9000000000';
  const fieldClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2 outline-none transition focus:border-emerald-500';
  const sectionClassName = 'rounded-2xl border border-slate-200 bg-[#E5E7EB] p-4';
  const compactActionButtonClassName =
    'rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50';

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

  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [signupVerificationToken, setSignupVerificationToken] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');

    if (key === 'email' || key === 'name') {
      setOtpVerified(false);
      setSignupVerificationToken('');
      setOtpMessage('');
      if (key === 'email' && value !== otpEmail) {
        setOtpRequested(false);
        setOtp('');
      }
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!form.name.trim()) {
      setError('Name is required before OTP verification');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required before OTP verification');
      return;
    }

    setOtpRequested(true);
    setIsSendingOtp(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: otpVerificationPhone,
        role: 'doctor',
      };

      const { data } = await apiClient.post<{ message: string; otp?: string; emailDelivered?: boolean }>(
        '/auth/signup/request-otp-email',
        payload,
      );

      setOtpVerified(false);
      setSignupVerificationToken('');
      setOtp('');
      setOtpEmail(payload.email);
      if (data?.otp) {
        setOtpMessage(`${data.message || 'OTP generated'} OTP: ${data.otp}`);
      } else {
        setOtpMessage(data.message || 'OTP sent to email');
      }
    } catch (err) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.status === 409
          ? 'This email is already registered. Use a different doctor email.'
          : err.response?.data?.message ?? 'Failed to send OTP'
        : err instanceof Error
          ? err.message
          : 'Failed to send OTP';
      setError(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setOtpMessage('');

    if (!otp.trim()) {
      setError('Enter OTP to verify email');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { data } = await apiClient.post<{ message: string; signupVerificationToken: string }>(
        '/auth/signup/verify-otp',
        {
          email: form.email.trim().toLowerCase(),
          phone: otpVerificationPhone,
          role: 'doctor',
          otp: otp.trim(),
        },
      );

      setOtpVerified(true);
      setSignupVerificationToken(data.signupVerificationToken);
      setOtpMessage('OTP verified successfully');
    } catch (err) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message ?? 'OTP verification failed'
        : 'OTP verification failed';
      setOtpVerified(false);
      setSignupVerificationToken('');
      setError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!otpVerified || !signupVerificationToken) {
      setError('Please verify OTP for the doctor email before adding doctor');
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
        signupVerificationToken,
      });
      setOtpMessage('Doctor added successfully and sent for admin approval.');
      onClose();
    } catch (err: any) {
      if (axios.isAxiosError<{ message?: string }>(err) && err.response?.status === 409) {
        setError('This email is already registered. Use a different doctor email.');
      } else {
        setError(err.response?.data?.message || 'Failed to add doctor');
      }
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
            <span aria-hidden="true" className="text-lg leading-none text-slate-700">x</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

          <section className={sectionClassName}>
            <p className="mb-3 text-sm font-semibold text-slate-900">Basic Details</p>
            <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <div className="flex gap-2">
                <input required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={fieldClassName} />
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={isSendingOtp}
                  className={compactActionButtonClassName}
                >
                  {isSendingOtp ? 'Sending...' : 'Verify'}
                </button>
              </div>
              {otpRequested ? (
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">OTP</label>
                  <div className="flex gap-2">
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={fieldClassName}
                      placeholder="Enter OTP"
                    />
                    <button
                      type="button"
                      onClick={() => void handleVerifyOtp()}
                      disabled={isVerifyingOtp}
                      className={compactActionButtonClassName}
                    >
                      {isVerifyingOtp ? 'Verifying...' : 'Submit OTP'}
                    </button>
                  </div>
                </div>
              ) : null}
              {otpMessage ? <p className="mt-1 text-xs text-emerald-700">{otpMessage}</p> : null}
              {otpVerified ? <p className="mt-1 text-xs font-semibold text-emerald-700">Email verified</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input required value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</label>
              <input required type="date" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input required type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
              <input required type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className={fieldClassName} />
            </div>
            </div>
          </section>

          <section className={sectionClassName}>
            <p className="mb-3 text-sm font-semibold text-slate-900">Doctor Details</p>
            <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Specialization</label>
              <input required value={form.specialization} onChange={(e) => updateField('specialization', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Qualification</label>
              <input required value={form.qualification} onChange={(e) => updateField('qualification', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Experience (Years)</label>
              <input required type="number" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Consultation Fees</label>
              <input required type="number" value={form.consultationFees} onChange={(e) => updateField('consultationFees', e.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medical Council Code</label>
              <input required inputMode="numeric" value={form.medicalRegistrationNumber} onChange={(e) => updateField('medicalRegistrationNumber', e.target.value.replace(/\D/g, ''))} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medical Council Board</label>
              <input required value={form.medicalCouncilBoard} onChange={(e) => updateField('medicalCouncilBoard', e.target.value)} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Council Name</label>
              <input required value={form.councilRegisteredName} onChange={(e) => updateField('councilRegisteredName', e.target.value)} className={fieldClassName} />
            </div>
            </div>
          </section>
          

          <div className="flex justify-center border-t border-slate-100 pt-4">
              <button type="submit" disabled={isSubmitting}
                className="flex items-center justify-center min-w-[110px] rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Adding...' : 'Add Doctor'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};
