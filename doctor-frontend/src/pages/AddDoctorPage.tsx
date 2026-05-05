import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCheckCircle, FiClock, FiPlus, FiTrash2, FiCalendar, FiMail, FiPhone, FiUser, FiBriefcase, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { apiClient } from '@/services/api';

const MEDICAL_COUNCIL_BOARDS = [
  'Andhra Pradesh Medical Council', 'Arunachal Pradesh Medical Council', 'Assam Medical Council', 'Bihar Medical Council',
  'Chandigarh Medical Council', 'Chhattisgarh Medical Council', 'Delhi Medical Council', 'Goa Medical Council',
  'Gujarat Medical Council', 'Haryana Medical Council', 'Himachal Pradesh Medical Council', 'Jammu & Kashmir Medical Council',
  'Jharkhand Medical Council', 'Karnataka Medical Council', 'Kerala State Medical Council', 'Madhya Pradesh Medical Council',
  'Maharashtra Medical Council', 'Manipur Medical Council', 'Meghalaya Medical Council', 'Mizoram Medical Council',
  'Nagaland Medical Council', 'Odisha Council of Medical Registration', 'Pondicherry Medical Council', 'Punjab Medical Council',
  'Rajasthan Medical Council', 'Sikkim Medical Council', 'Tamil Nadu Medical Council', 'Telangana State Medical Council',
  'Tripura State Medical Council', 'Uttar Pradesh Medical Council', 'Uttarakhand Medical Council', 'West Bengal Medical Council',
];

const SPECIALIZATIONS = [
  'General Physician', 'Pediatrician', 'Gynecologist', 'Cardiologist', 'Dermatologist', 'Orthopedic',
  'ENT Specialist', 'Dentist', 'Ayurveda', 'Homeopathy', 'Physiotherapist', 'Psychiatrist',
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AddDoctorPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    specialization: '',
    experience: '',
    qualification: '',
    medicalCouncilBoard: '',
    medicalRegistrationNumber: '',
    consultationFees: '',
    clinicName: '',
    city: '',
    clinicAddress: '',
    availableDays: [] as string[],
    availableTimeSlots: [] as string[],
    aboutDoctor: '',
    profileImageUrl: '',
    clinicImageUrl: '',
    certificateUrl: '',
    signupVerificationToken: '',
  });

  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState(false);
  const daysDropdownRef = useRef<HTMLDivElement>(null);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (daysDropdownRef.current && !daysDropdownRef.current.contains(event.target as Node)) {
        setIsDaysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const formatTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const addTimeSlot = () => {
    if (!startTime || !endTime) return;
    const slot = `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;
    if (formData.availableTimeSlots.includes(slot)) {
      setError('This time slot already exists');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: [...prev.availableTimeSlots, slot],
    }));
    setError('');
    setStartTime('');
    setEndTime('');
  };

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: prev.availableTimeSlots.filter((_, i) => i !== index),
    }));
  };

  const requestOtp = async () => {
    if (!formData.email || !formData.phone || !formData.name) {
      setError('Please fill Name, Email and Phone first');
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
      setError('');
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
    if (formData.availableDays.length === 0) {
      setError('Please select working days.');
      return;
    }
    if (formData.availableTimeSlots.length === 0) {
      setError('Please add at least one time slot.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await apiClient.post('/doctor/doctors', {
        ...formData,
        experience: Number(formData.experience),
        consultationFees: Number(formData.consultationFees),
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";
  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1";
  const sectionClass = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm";

  return (
    <div className="min-h-screen bg-[#FAFBFC] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add Doctor</h1>
            <p className="text-sm text-slate-500">Register new professional profile</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <FiArrowLeft size={14} /> Back
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          {/* BASIC DETAILS */}
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <FiUser size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Basic Details</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input className={inputClass} name="name" required placeholder="Name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>Email Address *</label>
                <div className="flex gap-2 max-w-[280px]">
                  <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" disabled={isEmailVerified} name="email" required type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} />
                  {!isEmailVerified && (
                    <button type="button" onClick={requestOtp} disabled={isVerifying || !formData.email} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                      Verify
                    </button>
                  )}
                  {isEmailVerified && (
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white">
                      <FiCheckCircle />
                    </div>
                  )}
                </div>
                {isOtpSent && !isEmailVerified && (
                  <div className="mt-2 flex gap-2 max-w-[280px]">
                    <input className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-xs outline-none" placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <button type="button" onClick={verifyOtp} disabled={isVerifying || otp.length < 4} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                      OK
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Phone Number *</label>
                <input className={inputClass} name="phone" required placeholder="Phone" value={formData.phone} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth *</label>
                <input className={inputClass} name="dateOfBirth" required type="date" value={formData.dateOfBirth} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          {/* PROFESSIONAL DETAILS */}
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <FiBriefcase size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Professional Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Specialization *</label>
                <select className={inputClass} name="specialization" required value={formData.specialization} onChange={handleInputChange}>
                  <option value="">Select</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Experience (Yrs) *</label>
                <input className={inputClass} name="experience" required type="number" placeholder="Exp" value={formData.experience} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>Qualification *</label>
                <input className={inputClass} name="qualification" required placeholder="Qualification" value={formData.qualification} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>Medical Council Board *</label>
                <select className={inputClass} name="medicalCouncilBoard" required value={formData.medicalCouncilBoard} onChange={handleInputChange}>
                  <option value="">Select</option>
                  {MEDICAL_COUNCIL_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Registration Code *</label>
                <input className={inputClass} name="medicalRegistrationNumber" required placeholder="Code" value={formData.medicalRegistrationNumber} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>Consultation Fees *</label>
                <input className={inputClass} name="consultationFees" required type="number" placeholder="Fees" value={formData.consultationFees} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          {/* CLINIC & AVAILABILITY */}
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <FiMapPin size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Clinic & Availability</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Clinic Name *</label>
                <input className={inputClass} name="clinicName" required placeholder="Clinic" value={formData.clinicName} onChange={handleInputChange} />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input className={inputClass} name="city" required placeholder="City" value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Clinic Address *</label>
                <input className="w-full max-w-[570px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" name="clinicAddress" required placeholder="Address" value={formData.clinicAddress} onChange={handleInputChange} />
              </div>
              
              <div className="relative" ref={daysDropdownRef}>
                <label className={labelClass}>Working Days *</label>
                <button
                  type="button"
                  onClick={() => setIsDaysDropdownOpen(!isDaysDropdownOpen)}
                  className={inputClass + " flex items-center justify-between"}
                >
                  <span className="truncate">
                    {formData.availableDays.length > 0 ? formData.availableDays.join(', ') : 'Select Days'}
                  </span>
                  <FiChevronDown className={`transition-transform ${isDaysDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDaysDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full max-w-[280px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                    {WEEK_DAYS.map(day => (
                      <label key={day} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.availableDays.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                        />
                        <span className={formData.availableDays.includes(day) ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                          {day}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Time Slots *</label>
                <div className="flex items-center gap-2 max-w-[280px]">
                  <input type="time" className="flex-1 rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <span className="text-slate-400">to</span>
                  <input type="time" className="flex-1 rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  <button type="button" onClick={addTimeSlot} className="rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700">
                    <FiPlus size={18} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 max-w-[280px]">
                  {formData.availableTimeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">
                      <FiClock size={10} /> {slot} <button type="button" onClick={() => removeTimeSlot(i)} className="text-emerald-400 hover:text-rose-500"><FiTrash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SUBMIT */}
          <div className="flex flex-col items-center gap-3 pb-8 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isEmailVerified}
              className="w-full max-w-xs rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Doctor Profile'}
            </button>
            {!isEmailVerified && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Required</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDoctorPage;
