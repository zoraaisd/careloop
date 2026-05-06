import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUser, FiBriefcase } from 'react-icons/fi';
import { apiClient } from '@/services/api';

const SPECIALIZATIONS = [
  'General Physician', 'Pediatrician', 'Gynecologist', 'Cardiologist', 'Dermatologist', 'Orthopedic',
  'ENT Specialist', 'Dentist', 'Ayurveda', 'Homeopathy', 'Physiotherapist', 'Psychiatrist',
];

const AddDoctorPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    qualification: '',
    aboutDoctor: '',
    signupVerificationToken: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    const newErrors = { ...fieldErrors };

    if (name === 'name') {
      const originalValue = value;
      value = value.replace(/[^A-Za-z\s]/g, '');
      newErrors.name = originalValue !== value ? 'Numbers and special characters are not allowed.' : '';
    }

    if (name === 'phone') {
      const originalValue = value;
      value = value.replace(/[^0-9+]/g, '');
      newErrors.phone = originalValue !== value ? 'Only numbers and + are allowed.' : '';
    }

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      newErrors.email = value && !emailRegex.test(value) ? 'Please enter a valid email format.' : '';
    }

    setFieldErrors(newErrors);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const requestOtp = async () => {
    if (!formData.email || !formData.phone || !formData.name) {
      setError('Please fill Name, Email and Phone first');
      return;
    }
    if (fieldErrors.email || fieldErrors.name || fieldErrors.phone) {
      setError('Please fix validation errors first');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      await apiClient.post('/auth/signup/request-otp-email', {
        email: formData.email,
        phone: formData.phone,
        name: formData.name,
        role: 'doctor',
      });
      setIsOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return;
    setIsVerifying(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/signup/verify-otp', {
        email: formData.email,
        phone: formData.phone,
        role: 'doctor',
        otp,
      });
      setFormData((prev) => ({ ...prev, signupVerificationToken: res.data.signupVerificationToken }));
      setIsEmailVerified(true);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setError('Email verification required.');
      return;
    }
    if (fieldErrors.email || fieldErrors.name || fieldErrors.phone) {
      setError('Please fix validation errors first.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await apiClient.post('/doctor/doctors', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        specialization: formData.specialization.trim(),
        experience: Number(formData.experience),
        qualification: formData.qualification.trim(),
        aboutDoctor: formData.aboutDoctor.trim() || undefined,
        signupVerificationToken: formData.signupVerificationToken,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300';
  const labelClass = 'block text-[13px] font-bold text-slate-700 mb-2 ml-1 tracking-wide';
  const sectionClass = 'border-b border-slate-100 pb-10 mb-10 last:border-0 last:pb-0 last:mb-0';

  return (
    <div className="min-h-screen bg-[#FAFBFC] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Add Doctor</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Register new professional profile</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
          >
            <FiArrowLeft size={16} /> Back
          </button>
        </header>

        <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-emerald-50 opacity-50 blur-3xl pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="relative z-10">
            {error && (
              <div className="mb-8 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                {error}
              </div>
            )}

            <section className={sectionClass}>
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-inner">
                  <FiUser size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Basic Details</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Personal information and contact</p>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input className={inputClass} name="name" required placeholder="Dr. Firstname Lastname" maxLength={30} value={formData.name} onChange={handleInputChange} />
                  {fieldErrors.name && <div className="mt-2 text-[11px] font-bold text-rose-500">{fieldErrors.name}</div>}
                </div>

                <div>
                  <label className={labelClass}>Email Address *</label>
                  <div className="flex gap-3">
                    <input className={inputClass} disabled={isEmailVerified} name="email" required type="email" placeholder="doctor@example.com" maxLength={40} value={formData.email} onChange={handleInputChange} />
                    {!isEmailVerified && (
                      <button type="button" onClick={requestOtp} disabled={isVerifying || !formData.email} className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50 shrink-0">
                        Verify
                      </button>
                    )}
                    {isEmailVerified && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-md shrink-0">
                        <FiCheckCircle size={18} /> Verified
                      </div>
                    )}
                  </div>
                  {fieldErrors.email && <div className="mt-2 text-[11px] font-bold text-rose-500">{fieldErrors.email}</div>}

                  {isOtpSent && !isEmailVerified && (
                    <div className="mt-4 flex gap-3">
                      <input className="w-full rounded-xl border border-emerald-300 bg-emerald-50/30 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/20" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                      <button type="button" onClick={verifyOtp} disabled={isVerifying || otp.length < 4} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 shrink-0">
                        Submit
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input className={inputClass} name="phone" required placeholder="+91" maxLength={15} value={formData.phone} onChange={handleInputChange} />
                  {fieldErrors.phone && <div className="mt-2 text-[11px] font-bold text-rose-500">{fieldErrors.phone}</div>}
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-inner">
                  <FiBriefcase size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Professional Details</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Qualifications and expertise</p>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Specialization *</label>
                  <select className={inputClass} name="specialization" required value={formData.specialization} onChange={handleInputChange}>
                    <option value="">Select Specialization</option>
                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Experience (Yrs) *</label>
                  <input className={inputClass} name="experience" required type="number" placeholder="Years of experience" value={formData.experience} onChange={handleInputChange} />
                </div>
                <div>
                  <label className={labelClass}>Qualification *</label>
                  <input className={inputClass} name="qualification" required placeholder="e.g. MBBS, MD" value={formData.qualification} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>About Doctor</label>
                  <textarea className={inputClass} name="aboutDoctor" placeholder="Short professional summary (optional)" value={formData.aboutDoctor} onChange={handleInputChange} />
                </div>
              </div>
            </section>

            <div className="flex flex-col items-center gap-3 pt-6 pb-2">
              <button
                type="submit"
                disabled={isSubmitting || !isEmailVerified}
                className="w-full max-w-md rounded-2xl bg-emerald-600 py-4 text-base font-bold tracking-wide text-white shadow-xl shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-700 hover:-translate-y-1 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:transform-none"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Doctor Profile'}
              </button>
              {!isEmailVerified && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Verification Required To Submit</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDoctorPage;
