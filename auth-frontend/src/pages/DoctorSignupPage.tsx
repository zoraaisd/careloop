import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';

type BasicDetails = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  signupVerificationToken: string;
};

type DoctorForm = {
  specialization: string;
  experience: string;
  qualification: string;
  medicalRegistrationNumber: string;
  clinicName: string;
  clinicAddress: string;
  clinicImageUrl: string;
  city: string;
  consultationFees: string;
  availableDays: string;
  availableTimeSlots: string;
  aboutDoctor: string;
  profileImageUrl: string;
  certificateUrl: string;
};

type TimeSelection = {
  hour: string;
  minute: string;
  period: (typeof periodOptions)[number];
};

const doctorSpecializations = [
  'General Physician',
  'Pediatrician',
  'Gynecologist',
  'Cardiologist',
  'Dermatologist',
  'Orthopedic',
  'ENT Specialist',
  'Dentist',
  'Ayurveda',
  'Homeopathy',
  'Physiotherapist',
  'Psychiatrist',
] as const;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const hourOptions = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
const minuteOptions = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));
const periodOptions = ['AM', 'PM'] as const;

const initialDoctorForm: DoctorForm = {
  specialization: '',
  experience: '',
  qualification: '',
  medicalRegistrationNumber: '',
  clinicName: '',
  clinicAddress: '',
  clinicImageUrl: '',
  city: '',
  consultationFees: '',
  availableDays: '',
  availableTimeSlots: '',
  aboutDoctor: '',
  profileImageUrl: '',
  certificateUrl: '',
};

const initialTimeSelection: TimeSelection = {
  hour: '',
  minute: '',
  period: 'AM',
};

const DoctorSignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    | { basicDetails?: BasicDetails; doctorProfessionalDetails?: DoctorForm }
    | null;
  const basicDetails = state?.basicDetails;
  const [form, setForm] = useState<DoctorForm>(() => state?.doctorProfessionalDetails ?? initialDoctorForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeSelection, setStartTimeSelection] = useState<TimeSelection>(initialTimeSelection);
  const [endTimeSelection, setEndTimeSelection] = useState<TimeSelection>(initialTimeSelection);
  const [activeTimeDropdown, setActiveTimeDropdown] = useState<'start' | 'end' | null>(null);
  const [isLocalClinicImageSelected, setIsLocalClinicImageSelected] = useState(false);
  const [isLocalProfileImageSelected, setIsLocalProfileImageSelected] = useState(false);
  const [clinicImageFileName, setClinicImageFileName] = useState('');
  const [profileImageFileName, setProfileImageFileName] = useState('');
  const dayDropdownRef = useRef<HTMLLabelElement | null>(null);
  const timeDropdownRef = useRef<HTMLLabelElement | null>(null);
  const clinicImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageFileInputRef = useRef<HTMLInputElement | null>(null);

  const hasBasicDetails = useMemo(
    () =>
      Boolean(
        basicDetails?.name &&
          basicDetails.email &&
          basicDetails.phone &&
          basicDetails.password &&
          basicDetails.confirmPassword &&
          basicDetails.signupVerificationToken,
      ),
    [basicDetails],
  );

  const handleInput =
    (field: keyof DoctorForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        delete nextErrors.form;
        return nextErrors;
      });
    };

  const validateStepOne = () => {
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof DoctorForm> = [
      'specialization',
      'experience',
      'qualification',
      'clinicName',
      'clinicAddress',
      'city',
      'consultationFees',
      'availableDays',
      'availableTimeSlots',
    ];

    requiredFields.forEach((field) => {
      if (!form[field].trim()) {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (form.experience && Number(form.experience) < 0) {
      nextErrors.experience = 'Experience must be a positive number.';
    }

    if (form.consultationFees && Number(form.consultationFees) <= 0) {
      nextErrors.consultationFees = 'Fees must be greater than zero.';
    }

    if (
      form.availableDays.trim() &&
      form.availableDays
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean).length === 0
    ) {
      nextErrors.availableDays = 'Enter at least one valid available day.';
    }

    if (
      form.availableTimeSlots.trim() &&
      form.availableTimeSlots
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean).length === 0
    ) {
      nextErrors.availableTimeSlots = 'Enter at least one valid time slot.';
    }

    return nextErrors;
  };

  const updateDays = (nextDays: string[]) => {
    const orderedDays = weekDays.filter((day) => nextDays.includes(day));
    setSelectedDays(orderedDays);
    setForm((current) => ({ ...current, availableDays: orderedDays.join(', ') }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.availableDays;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const toggleDay = (day: string) => {
    const nextDays = selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day];
    updateDays(nextDays);
  };

  const toggleAllDays = () => {
    if (selectedDays.length === weekDays.length) {
      updateDays([]);
      return;
    }

    updateDays([...weekDays]);
  };

  const addTimeSlot = () => {
    if (!startTime || !endTime) {
      return false;
    }

    const toMinutes = (timeValue: string) => {
      const [hourValue, minuteValue] = timeValue.split(':');
      if (!hourValue || !minuteValue) return null;
      const hour = Number(hourValue);
      const minute = Number(minuteValue);
      if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
      return hour * 60 + minute;
    };

    const toDisplay = (timeValue: string) => {
      const [hourValue, minuteValue] = timeValue.split(':');
      const hour24 = Number(hourValue);
      const minute = Number(minuteValue);
      if (!Number.isInteger(hour24) || !Number.isInteger(minute)) return timeValue;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
    };

    const startValue = toMinutes(startTime);
    const endValue = toMinutes(endTime);
    if (startValue === null || endValue === null) {
      return false;
    }

    if (endValue <= startValue) {
      setErrors((current) => ({ ...current, availableTimeSlots: 'Select a valid start and end time.' }));
      return false;
    }

    const nextSlot = `${toDisplay(startTime)} - ${toDisplay(endTime)}`;
    if (selectedTimeSlots.includes(nextSlot)) {
      return false;
    }

    const nextSlots = [...selectedTimeSlots, nextSlot];
    setSelectedTimeSlots(nextSlots);
    setForm((current) => ({ ...current, availableTimeSlots: nextSlots.join(', ') }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.availableTimeSlots;
      delete nextErrors.form;
      return nextErrors;
    });
    setStartTime('');
    setEndTime('');
    setStartTimeSelection(initialTimeSelection);
    setEndTimeSelection(initialTimeSelection);
    setActiveTimeDropdown(null);
    return true;
  };

  const removeTimeSlot = (slot: string) => {
    const nextSlots = selectedTimeSlots.filter((item) => item !== slot);
    setSelectedTimeSlots(nextSlots);
    setForm((current) => ({ ...current, availableTimeSlots: nextSlots.join(', ') }));
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isDayDropdownOpen && dayDropdownRef.current && !dayDropdownRef.current.contains(target)) {
        setIsDayDropdownOpen(false);
      }

      if (activeTimeDropdown && timeDropdownRef.current && !timeDropdownRef.current.contains(target)) {
        setActiveTimeDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeTimeDropdown, isDayDropdownOpen]);

  useEffect(() => {
    const to24HourValue = (selection: TimeSelection) => {
      if (!selection.hour || !selection.minute) {
        return '';
      }

      const parsedHour = Number(selection.hour);
      if (!Number.isInteger(parsedHour) || parsedHour < 1 || parsedHour > 12) {
        return '';
      }

      const hour24 = selection.period === 'PM' ? (parsedHour % 12) + 12 : parsedHour % 12;
      return `${String(hour24).padStart(2, '0')}:${selection.minute}`;
    };

    setStartTime(to24HourValue(startTimeSelection));
    setEndTime(to24HourValue(endTimeSelection));
  }, [endTimeSelection, startTimeSelection]);

  useEffect(() => {
    if (!startTime || !endTime) {
      return;
    }

    addTimeSlot();
  }, [startTime, endTime]);

  const readImageFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.readAsDataURL(file);
    });

  const handleClinicImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setForm((current) => ({ ...current, clinicImageUrl: dataUrl }));
      setIsLocalClinicImageSelected(true);
      setClinicImageFileName(file.name);
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.clinicImageUrl;
        delete nextErrors.form;
        return nextErrors;
      });
    } catch {
      setErrors((current) => ({ ...current, clinicImageUrl: 'Unable to read selected clinic image file.' }));
    } finally {
      event.target.value = '';
    }
  };

  const handleClinicImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, clinicImageUrl: event.target.value }));
    setIsLocalClinicImageSelected(false);
    setClinicImageFileName('');
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.clinicImageUrl;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleProfileImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setForm((current) => ({ ...current, profileImageUrl: dataUrl }));
      setIsLocalProfileImageSelected(true);
      setProfileImageFileName(file.name);
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.profileImageUrl;
        delete nextErrors.form;
        return nextErrors;
      });
    } catch {
      setErrors((current) => ({ ...current, profileImageUrl: 'Unable to read selected profile image file.' }));
    } finally {
      event.target.value = '';
    }
  };

  const handleProfileImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, profileImageUrl: event.target.value }));
    setIsLocalProfileImageSelected(false);
    setProfileImageFileName('');
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.profileImageUrl;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleNextStep = () => {
    const nextErrors = validateStepOne();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    navigate('/doctor-signup/council-verification', {
      state: {
        basicDetails,
        doctorProfessionalDetails: form,
      },
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleNextStep();
  };

  if (!hasBasicDetails) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Care Loop</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Start from signup</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Doctor registration is a two-step flow. Begin on the signup page so we can collect your account details
            first.
          </p>
          <div className="mt-6">
            <Button className="rounded-2xl px-6" onClick={() => navigate('/signup')} type="button">
              Back to signup
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const accountDetails = basicDetails as BasicDetails;
  const fieldClassName =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-2 focus:ring-green-100';
  const daySummary =
    selectedDays.length === 0
      ? 'Select available days'
      : selectedDays.length === weekDays.length
        ? `All days selected (${weekDays.length})`
        : selectedDays.join(', ');
  const clinicImageInputValue = isLocalClinicImageSelected ? clinicImageFileName : form.clinicImageUrl;
  const profileImageInputValue = isLocalProfileImageSelected ? profileImageFileName : form.profileImageUrl;
  const formatTimeFieldValue = (selection: TimeSelection) =>
    selection.hour && selection.minute ? `${selection.hour}:${selection.minute} ${selection.period}` : '--:-- --';
  const updateTimeSelection = (type: 'start' | 'end', field: keyof TimeSelection, value: string) => {
    const updater = (current: TimeSelection): TimeSelection => {
      if (field === 'period') {
        const nextPeriod = value === 'PM' ? 'PM' : 'AM';
        return { ...current, period: nextPeriod };
      }

      return { ...current, [field]: value };
    };

    if (type === 'start') {
      setStartTimeSelection((current) => updater(current));
      return;
    }

    setEndTimeSelection((current) => updater(current));
  };
  const renderTimeDropdown = (type: 'start' | 'end', selection: TimeSelection) => (
    <div className="absolute z-20 mt-1 w-full min-w-[250px] rounded-md border border-slate-300 bg-white p-2 shadow-lg">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="flex h-8 items-center justify-center rounded-sm border-2 border-slate-900 bg-slate-100 text-sm font-semibold text-slate-900">
          {selection.hour || 'HH'}
        </div>
        <div className="flex h-8 items-center justify-center rounded-sm border border-slate-300 bg-slate-100 text-sm font-semibold text-slate-900">
          {selection.minute || 'MM'}
        </div>
        <div className="flex h-8 items-center justify-center rounded-sm border border-slate-300 bg-slate-100 text-sm font-semibold text-slate-900">
          {selection.period}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="max-h-48 overflow-y-auto border border-slate-200 bg-white py-1">
          {hourOptions.map((hour) => (
            <button
              className={`w-full px-2 py-1 text-center text-sm ${
                selection.hour === hour ? 'font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
              key={hour}
              onClick={() => updateTimeSelection(type, 'hour', hour)}
              type="button"
            >
              {hour}
            </button>
          ))}
        </div>
        <div className="max-h-48 overflow-y-auto border border-slate-200 bg-white py-1">
          {minuteOptions.map((minute) => (
            <button
              className={`w-full px-2 py-1 text-center text-sm ${
                selection.minute === minute ? 'font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
              key={minute}
              onClick={() => updateTimeSelection(type, 'minute', minute)}
              type="button"
            >
              {minute}
            </button>
          ))}
        </div>
        <div className="max-h-48 overflow-y-auto border border-slate-200 bg-white py-1">
          {periodOptions.map((period) => (
            <button
              className={`w-full px-2 py-1 text-center text-sm ${
                selection.period === period ? 'font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
              key={period}
              onClick={() => updateTimeSelection(type, 'period', period)}
              type="button"
            >
              {period}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Doctor onboarding</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Professional details</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                After submission, your profile enters admin review. You can start your trial, but only approved doctors
                appear on the public Care Loop homepage.
              </p>
            </div>
            <Link className="text-sm font-semibold text-[#15803D]" to="/signup">
              Back to account details
            </Link>
          </div>

          <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Account summary</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <p><span className="font-semibold text-slate-900">Name:</span> {accountDetails.name}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {accountDetails.email}</p>
              <p><span className="font-semibold text-slate-900">Phone:</span> {accountDetails.phone}</p>
            </div>
          </div>

          <form className="mt-7 space-y-5 px-2 pb-3 sm:px-4 sm:pb-4" noValidate onSubmit={handleSubmit}>
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Doctor Details</p>
              <div className="mt-3 grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Specialization</span>
                  <select
                    className={`${fieldClassName} appearance-none bg-none`}
                    onChange={handleInput('specialization')}
                    size={1}
                    value={form.specialization}
                  >
                    <option value="">Select specialization</option>
                    {doctorSpecializations.map((specialization) => (
                      <option key={specialization} value={specialization}>
                        {specialization}
                      </option>
                    ))}
                  </select>
                  {errors.specialization ? <p className="mt-1 text-xs font-medium text-rose-500">{errors.specialization}</p> : null}
                </label>
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.experience}
                  label="Experience (years)"
                  onChange={handleInput('experience')}
                  type="number"
                  value={form.experience}
                />
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.qualification}
                  label="Qualification"
                  onChange={handleInput('qualification')}
                  value={form.qualification}
                />
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  label="Medical Registration Number"
                  onChange={handleInput('medicalRegistrationNumber')}
                  value={form.medicalRegistrationNumber}
                />
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.consultationFees}
                  label="Consultation Fees"
                  onChange={handleInput('consultationFees')}
                  type="number"
                  value={form.consultationFees}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Clinic Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.clinicName}
                  label="Clinic Name"
                  onChange={handleInput('clinicName')}
                  value={form.clinicName}
                />
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.city}
                  label="City"
                  onChange={handleInput('city')}
                  value={form.city}
                />
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  error={errors.clinicAddress}
                  label="Clinic Address"
                  onChange={handleInput('clinicAddress')}
                  value={form.clinicAddress}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Clinic Image</span>
                  <div className="relative">
                    <input
                      className={`${fieldClassName} pr-20`}
                      onChange={handleClinicImageUrlChange}
                      placeholder="Paste URL or choose file"
                      type={isLocalClinicImageSelected ? 'text' : 'url'}
                      value={clinicImageInputValue}
                    />
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                      onClick={() => clinicImageFileInputRef.current?.click()}
                      type="button"
                    >
                      Choose
                    </button>
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={handleClinicImageFileChange}
                      ref={clinicImageFileInputRef}
                      type="file"
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Timing Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block" ref={dayDropdownRef}>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Available Days</span>
                  <div className="relative">
                    <button
                      className={`${fieldClassName} flex items-center justify-between text-left`}
                      onClick={() => setIsDayDropdownOpen((current) => !current)}
                      type="button"
                    >
                      <span className={selectedDays.length === 0 ? 'text-slate-400' : ''}>{daySummary}</span>
                      <span className="text-slate-500">{isDayDropdownOpen ? '^' : ''}</span>
                    </button>
                    {isDayDropdownOpen ? (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg">
                        <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-700">
                          <input
                            checked={selectedDays.length === weekDays.length}
                            onChange={toggleAllDays}
                            type="checkbox"
                          />
                          Select All Days
                        </label>
                        <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {weekDays.map((day) => (
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700" key={day}>
                              <input checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} type="checkbox" />
                              {day}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {errors.availableDays ? <p className="mt-1 text-xs font-medium text-rose-500">{errors.availableDays}</p> : null}
                </label>
                <label className="block" ref={timeDropdownRef}>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Available Time Slots</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <button
                        className={`${fieldClassName} flex items-center justify-between text-left`}
                        onClick={() => setActiveTimeDropdown((current) => (current === 'start' ? null : 'start'))}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">Start</span>
                          <span className={!startTime ? 'text-slate-400' : ''}>{formatTimeFieldValue(startTimeSelection)}</span>
                        </span>
                        <span className="ml-2 text-slate-500">
                          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" fill="none" r="9" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M12 7.5v5l3 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                          </svg>
                        </span>
                      </button>
                      {activeTimeDropdown === 'start' ? renderTimeDropdown('start', startTimeSelection) : null}
                    </div>
                    <div className="relative">
                      <button
                        className={`${fieldClassName} flex items-center justify-between text-left`}
                        onClick={() => setActiveTimeDropdown((current) => (current === 'end' ? null : 'end'))}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">End</span>
                          <span className={!endTime ? 'text-slate-400' : ''}>{formatTimeFieldValue(endTimeSelection)}</span>
                        </span>
                        <span className="ml-2 text-slate-500">
                          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" fill="none" r="9" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M12 7.5v5l3 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                          </svg>
                        </span>
                      </button>
                      {activeTimeDropdown === 'end' ? renderTimeDropdown('end', endTimeSelection) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedTimeSlots.map((slot) => (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                        key={slot}
                      >
                        {slot}
                        <button className="text-emerald-700 hover:text-emerald-900" onClick={() => removeTimeSlot(slot)} type="button">
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                  <span className="mt-1.5 block text-[11px] text-slate-500">Selected: {selectedTimeSlots.length}</span>
                  {errors.availableTimeSlots ? <p className="mt-1 text-xs font-medium text-rose-500">{errors.availableTimeSlots}</p> : null}
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Additional Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Profile Image</span>
                  <div className="relative">
                    <input
                      className={`${fieldClassName} pr-20`}
                      onChange={handleProfileImageUrlChange}
                      placeholder="Paste URL or choose file"
                      type={isLocalProfileImageSelected ? 'text' : 'url'}
                      value={profileImageInputValue}
                    />
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                      onClick={() => profileImageFileInputRef.current?.click()}
                      type="button"
                    >
                      Choose
                    </button>
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageFileChange}
                      ref={profileImageFileInputRef}
                      type="file"
                    />
                  </div>
                </label>
                <InputField
                  className="h-10 rounded-lg px-3 text-[13px]"
                  label="Certificate URL"
                  onChange={handleInput('certificateUrl')}
                  value={form.certificateUrl}
                />
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">About Doctor</span>
                  <textarea
                    className={`${fieldClassName} min-h-24`}
                    onChange={handleInput('aboutDoctor')}
                    placeholder="Share your care philosophy, expertise, and patient focus."
                    value={form.aboutDoctor}
                  />
                </label>
              </div>
            </section>

            <div className="flex justify-end">
              <Button className="rounded-xl px-5 py-2 text-sm" type="submit">
                Next
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export { DoctorSignupPage };



