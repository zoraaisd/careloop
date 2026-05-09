import React from 'react';
import { ArrowLeft, BriefcaseBusiness, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createClinicDoctor,
  requestDoctorEmailOtp,
  verifyDoctorEmailOtp,
} from '@/services/doctor-management';

const specializations = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
];

const inputClassName =
  'w-full rounded-2xl border border-[#dbe4ee] bg-[#fdfefe] px-4 py-[11px] text-[15px] text-[#17324d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-[#a1acba] focus:border-[#cfdbe8]';

const labelClassName = 'mb-2 block text-[14px] font-semibold text-[#2d3e56]';

function AddDoctorPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    otp: '',
    specialization: '',
    experience: '',
    qualification: '',
    aboutDoctor: '',
  });
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  const isBasicDetailsFilled =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.phone.trim().length > 0;

  const handleChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const rawValue = event.target.value;
      const value =
        field === 'phone'
          ? rawValue.replace(/[^\d+()\s-]/g, '').slice(0, 20)
          : field === 'otp'
            ? rawValue.replace(/\D/g, '').slice(0, 6)
            : field === 'experience'
              ? rawValue.replace(/[^\d]/g, '').slice(0, 2)
              : rawValue;

      const nextState: typeof form = { ...form, [field]: value };

      if (field === 'name' || field === 'email' || field === 'phone') {
        nextState.otp = '';
      }

      setForm(nextState);
      setErrorMessage('');

      if (field === 'name' || field === 'email' || field === 'phone') {
        setOtpRequested(false);
        setSuccessMessage('');
      }
    };

  const handleRequestOtp = async () => {
    if (!isBasicDetailsFilled) {
      setErrorMessage('Please fill in the basic details first.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await requestDoctorEmailOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: 'doctor',
      });

      setOtpRequested(true);
      setSuccessMessage('A security OTP has been sent to your (Clinic Owner) email address via EmailJS. Please verify to authorize this new doctor.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Unable to send security OTP. Please check your connection.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.otp.trim()) {
      setErrorMessage('Please enter the security OTP sent to your email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Verify the OTP first to get the token
      const verifyResponse = await verifyDoctorEmailOtp({
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: 'doctor',
        otp: form.otp.trim(),
      });

      // 2. Use the token to create the doctor
      const response = await createClinicDoctor({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        specialization: form.specialization.trim(),
        experience: Number(form.experience),
        qualification: form.qualification.trim(),
        aboutDoctor: form.aboutDoctor.trim(),
        signupVerificationToken: verifyResponse.signupVerificationToken,
      });

      setSuccessMessage(response.message || 'Doctor authorized and created successfully.');
      setTimeout(() => navigate('/clinic'), 1500);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Authorization failed. Please check the OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[896px] px-2 pb-6 pt-2">
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[28px] font-bold leading-none text-[#182b4d] md:text-[30px]">Add Doctor</h2>
          <p className="mt-2 text-[14px] font-medium text-[#72839a]">Register new professional profile</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/clinic')}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#e3e9f2] bg-white px-5 py-[11px] text-[14px] font-semibold text-[#33465f] shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:bg-[#fafcff]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <section className="rounded-[34px] border border-[#e7edf5] bg-[radial-gradient(circle_at_top_right,_rgba(230,250,244,0.95),_rgba(255,255,255,0)_26%),radial-gradient(circle_at_78%_28%,_rgba(246,232,216,0.42),_rgba(255,255,255,0)_18%),linear-gradient(180deg,_#ffffff_0%,_#fffefe_100%)] px-10 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:px-10">
        <div className="mb-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,_#dff8eb_0%,_#effbf5_100%)] text-[#12a167] shadow-[0_10px_20px_rgba(16,185,129,0.10)]">
              <UserRound className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[#213652]">Basic Details</h3>
              <p className="mt-0.5 text-[14px] text-[#74869d]">Personal information and contact</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="fullName">
                Full Name *
              </label>
              <input
                className={inputClassName}
                id="fullName"
                onChange={handleChange('name')}
                placeholder="Dr. Firstname Lastname"
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="email">
                Email Address *
              </label>
              <input
                className={inputClassName}
                id="email"
                onChange={handleChange('email')}
                placeholder="doctor@example.com"
                type="email"
                value={form.email}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="phone">
                Phone Number *
              </label>
              <input
                className={inputClassName}
                id="phone"
                onChange={handleChange('phone')}
                placeholder="+91"
                type="tel"
                value={form.phone}
              />
            </div>
          </div>

          {errorMessage ? <p className="mt-4 text-sm font-medium text-[#dc2626]">{errorMessage}</p> : null}
          {successMessage ? <p className="mt-4 text-sm font-medium text-[#1faa62]">{successMessage}</p> : null}
        </div>

        <div className="my-7 border-t border-[#edf2f7]" />

        <div>
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,_#deebff_0%,_#eff5ff_100%)] text-[#3b82f6] shadow-[0_10px_20px_rgba(59,130,246,0.10)]">
              <BriefcaseBusiness className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[#213652]">Professional Details</h3>
              <p className="mt-0.5 text-[14px] text-[#74869d]">Qualifications and expertise</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="specialization">
                Specialization *
              </label>
              <select
                className={inputClassName}
                id="specialization"
                onChange={handleChange('specialization')}
                value={form.specialization}
              >
                <option disabled value="">
                  Select Specialization
                </option>
                {specializations.map((specialization) => (
                  <option key={specialization} value={specialization}>
                    {specialization}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="experience">
                Experience (Yrs) *
              </label>
              <input
                className={inputClassName}
                id="experience"
                onChange={handleChange('experience')}
                placeholder="Years of experience"
                type="text"
                value={form.experience}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="qualification">
                Qualification *
              </label>
              <input
                className={inputClassName}
                id="qualification"
                onChange={handleChange('qualification')}
                placeholder="e.g. MBBS, MD"
                type="text"
                value={form.qualification}
              />
            </div>

            <div className="lg:col-span-2">
              <label className={labelClassName} htmlFor="aboutDoctor">
                About Doctor
              </label>
              <textarea
                className={`${inputClassName} min-h-[52px] resize-none`}
                id="aboutDoctor"
                onChange={handleChange('aboutDoctor')}
                placeholder="Short professional summary (optional)"
                value={form.aboutDoctor}
              />
            </div>
          </div>
        </div>

        <div className="mt-7 border-t border-[#edf2f7] pt-7 text-center">
          {!otpRequested ? (
            <button
              disabled={!isBasicDetailsFilled || isSendingOtp}
              type="button"
              className={
                isBasicDetailsFilled && !isSendingOtp
                  ? 'w-full max-w-[450px] cursor-pointer rounded-2xl bg-[#3b82f6] px-6 py-3 text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:bg-[#2563eb]'
                  : 'w-full max-w-[450px] rounded-2xl bg-[#dfe8f2] px-6 py-3 text-[16px] font-semibold text-[#97a4b6]'
              }
              onClick={() => void handleRequestOtp()}
            >
              {isSendingOtp ? 'Sending Authorization Code...' : 'Authorize & Submit Profile'}
            </button>
          ) : (
            <div className="mx-auto max-w-[450px]">
              <div className="mb-4">
                <label className={labelClassName} htmlFor="otp">
                  Enter Owner's Security OTP *
                </label>
                <input
                  className={`${inputClassName} text-center text-lg tracking-widest`}
                  id="otp"
                  onChange={handleChange('otp')}
                  placeholder="000000"
                  type="text"
                  value={form.otp}
                />
              </div>
              <button
                disabled={!form.otp.trim() || isSubmitting}
                type="button"
                className={
                  form.otp.trim() && !isSubmitting
                    ? 'w-full cursor-pointer rounded-2xl bg-[#1faa62] px-6 py-3 text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(31,170,98,0.22)] transition hover:bg-[#199453]'
                    : 'w-full rounded-2xl bg-[#dfe8f2] px-6 py-3 text-[16px] font-semibold text-[#97a4b6]'
                }
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? 'Finalizing...' : 'Verify & Create Doctor'}
              </button>
              <button
                type="button"
                onClick={() => setOtpRequested(false)}
                className="mt-3 text-sm font-medium text-[#72839a] hover:text-[#182b4d]"
              >
                Go back to edit details
              </button>
            </div>
          )}
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9aa6b8]">
            {otpRequested ? 'Waiting for owner authorization' : 'Clinic owner authorization required'}
          </p>
        </div>
      </section>
    </div>
  );
}

export default AddDoctorPage;
