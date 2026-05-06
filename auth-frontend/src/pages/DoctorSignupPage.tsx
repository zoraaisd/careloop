import axios from 'axios';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { doctorSpecializations } from '@/constants/doctorSpecializations';
import { apiClient } from '@/services/api';
import { saveAuthSession, type AuthRole } from '@/services/auth-storage';

type SignupResponse = {
  token: string;
  role: AuthRole;
  userId: string;
  name?: string;
  email?: string;
  message: string;
};

type ValidationDetail = {
  field: string;
  constraints?: Record<string, string>;
};

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin;
const doctorAppUrl = import.meta.env.VITE_DOCTOR_APP_URL ?? 'http://localhost:5175';

const buildDoctorRedirectUrl = (baseUrl: string, data: SignupResponse): string => {
  const params = new URLSearchParams({
    token: data.token,
    role: data.role,
    userId: data.userId,
  });

  return `${baseUrl.replace(/\/+$/, '')}/doctor/dashboard?${params.toString()}`;
};

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
  clinicImageUrls: string[];
  clinicVideoUrls: string[];
  city: string;
  clinicPhone: string;
  availableDays: string;
  availableTimeSlots: string;
  aboutDoctor: string;
  profileImageUrl: string;
  certificateUrl: string;
};

type StringDoctorFormField = {
  [Key in keyof DoctorForm]: DoctorForm[Key] extends string ? Key : never;
}[keyof DoctorForm];

type TimeSelection = {
  hour: string;
  minute: string;
  period: (typeof periodOptions)[number];
};

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
  clinicImageUrls: [],
  clinicVideoUrls: [],
  city: '',
  clinicPhone: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
  const [clinicVideoUrlDraft, setClinicVideoUrlDraft] = useState('');
  const [clinicVideoFileNames, setClinicVideoFileNames] = useState<string[]>([]);
  const [profileImageFileName, setProfileImageFileName] = useState('');
  const dayDropdownRef = useRef<HTMLLabelElement | null>(null);
  const timeDropdownRef = useRef<HTMLLabelElement | null>(null);
  const clinicImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const clinicVideoFileInputRef = useRef<HTMLInputElement | null>(null);
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
    const requiredFields: StringDoctorFormField[] = [
      'specialization',
      'experience',
      'qualification',
      'clinicName',
      'clinicAddress',
      'city',
      'clinicPhone',
    ];

    requiredFields.forEach((field) => {
      if (!form[field].trim()) {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (form.experience && Number(form.experience) < 0) {
      nextErrors.experience = 'Experience must be a positive number.';
    }

    const clinicPhoneDigits = form.clinicPhone.replace(/\D/g, '');
    if (form.clinicPhone.trim() && clinicPhoneDigits.length !== 10) {
      nextErrors.clinicPhone = 'Clinic phone number must be exactly 10 digits.';
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

  const readMediaFilesAsDataUrls = async (files: FileList | null): Promise<string[]> => {
    if (!files?.length) return [];
    return Promise.all(Array.from(files).map((file) => readImageFileAsDataUrl(file)));
  };

  const addClinicImageUrls = (urls: string[]) => {
    const cleanUrls = urls.map((url) => url.trim()).filter(Boolean);
    if (cleanUrls.length === 0) return;

    setForm((current) => {
      const nextUrls = Array.from(new Set([...current.clinicImageUrls, ...cleanUrls]));
      return {
        ...current,
        clinicImageUrl: nextUrls[0] ?? '',
        clinicImageUrls: nextUrls,
      };
    });
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.clinicImageUrl;
      delete nextErrors.clinicImageUrls;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const addClinicVideoUrls = (urls: string[]) => {
    const cleanUrls = urls.map((url) => url.trim()).filter(Boolean);
    if (cleanUrls.length === 0) return;

    setForm((current) => ({
      ...current,
      clinicVideoUrls: Array.from(new Set([...current.clinicVideoUrls, ...cleanUrls])),
    }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.clinicVideoUrls;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleClinicImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const dataUrls = await readMediaFilesAsDataUrls(event.target.files);
      addClinicImageUrls(dataUrls);
      setIsLocalClinicImageSelected(true);
      setClinicImageFileName(Array.from(event.target.files ?? []).map((file) => file.name).join(', '));
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

  const handleAddClinicImageUrl = () => {
    addClinicImageUrls([form.clinicImageUrl]);
    setIsLocalClinicImageSelected(false);
    setClinicImageFileName('');
    setForm((current) => ({ ...current, clinicImageUrl: '' }));
  };

  const handleRemoveClinicImage = (url: string) => {
    setForm((current) => {
      const nextUrls = current.clinicImageUrls.filter((item) => item !== url);
      return {
        ...current,
        clinicImageUrl: nextUrls[0] ?? '',
        clinicImageUrls: nextUrls,
      };
    });
  };

  const handleClinicVideoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const dataUrls = await readMediaFilesAsDataUrls(event.target.files);
      addClinicVideoUrls(dataUrls);
      setClinicVideoFileNames(Array.from(event.target.files ?? []).map((file) => file.name));
    } catch {
      setErrors((current) => ({ ...current, clinicVideoUrls: 'Unable to read selected clinic video file.' }));
    } finally {
      event.target.value = '';
    }
  };

  const handleAddClinicVideoUrl = () => {
    addClinicVideoUrls([clinicVideoUrlDraft]);
    setClinicVideoUrlDraft('');
  };

  const handleRemoveClinicVideo = (url: string) => {
    setForm((current) => ({
      ...current,
      clinicVideoUrls: current.clinicVideoUrls.filter((item) => item !== url),
    }));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasBasicDetails || !basicDetails) {
      navigate('/signup');
      return;
    }

    const nextErrors = validateStepOne();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const parsedExperience = Number(form.experience);

      if (!Number.isFinite(parsedExperience) || parsedExperience < 0) {
        setErrors({ form: 'Experience must be a valid number.' });
        return;
      }

      const { data } = await apiClient.post<SignupResponse>('/auth/signup', {
        ...basicDetails,
        role: 'doctor',
        signupVerificationToken: basicDetails.signupVerificationToken,
        doctorProfile: {
          specialization: form.specialization.trim(),
          experience: parsedExperience,
          qualification: form.qualification.trim(),
          clinicName: form.clinicName.trim(),
          clinicAddress: form.clinicAddress.trim(),
          city: form.city.trim(),
          clinicPhoneNumber: form.clinicPhone.replace(/\D/g, ''),
        },
      });

      saveAuthSession(data);
      window.localStorage.setItem('careloop.signup.phone', basicDetails.phone.trim());
      window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
      window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
      setSuccessMessage('Doctor profile submitted. Redirecting to your workspace...');
      window.setTimeout(() => {
        window.location.assign(buildDoctorRedirectUrl(doctorAppUrl, data));
      }, 700);
    } catch (error) {
      if (axios.isAxiosError<{ message?: string; details?: ValidationDetail[] }>(error)) {
        if (!error.response) {
          setErrors({
            form: 'Unable to connect to backend API. Start backend server and verify it is running on port 4001 or 4000.',
          });
          return;
        }

        const response = error.response?.data;
        const details = response?.details;

        if (Array.isArray(details) && details.length > 0) {
          const nextErrors: Record<string, string> = {};
          const summaryMessages: string[] = [];

          details.forEach((detail) => {
            const field = detail.field?.replace(/^doctorProfile\./, '');
            const firstConstraint = detail.constraints ? Object.values(detail.constraints)[0] : '';
            if (field && firstConstraint && !nextErrors[field]) {
              nextErrors[field] = firstConstraint;
            }
            if (field && firstConstraint) {
              summaryMessages.push(`${field}: ${firstConstraint}`);
            }
          });

          if (summaryMessages.length > 0) {
            nextErrors.form = `Signup validation failed: ${summaryMessages.join('; ')}`;
          }

          if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
          }
        }

        setErrors({ form: response?.message ?? 'Doctor signup failed. Please try again.' });
        return;
      }

      setErrors({ form: 'Doctor signup failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Name:</p>
                <p className="mt-1 break-words text-slate-600">{accountDetails.name}</p>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Email:</p>
                <p className="mt-1 break-all text-slate-600">{accountDetails.email}</p>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Phone:</p>
                <p className="mt-1 break-words text-slate-600">{accountDetails.phone}</p>
              </div>
            </div>
          </div>

          <form className="mt-7 space-y-5 px-2 pb-3 sm:px-4 sm:pb-4" noValidate onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="mb-5 text-base font-bold text-slate-900 border-b border-slate-200 pb-3">Professional & Clinic Details</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 items-start">
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
                  error={errors.clinicPhone}
                  label="Clinic Phone Number"
                  onChange={handleInput('clinicPhone')}
                  type="tel"
                  value={form.clinicPhone}
                />
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
                <div className="sm:col-span-2">
                  <InputField
                    className="h-10 rounded-lg px-3 text-[13px]"
                    error={errors.clinicAddress}
                    label="Clinic Address"
                    onChange={handleInput('clinicAddress')}
                    value={form.clinicAddress}
                  />
                </div>
              </div>
            </div>

            {errors.form ? <p className="text-sm font-medium text-rose-500 mt-2 px-2">{errors.form}</p> : null}
            {successMessage ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mt-4">
                {successMessage}
              </p>
            ) : null}

            <div className="flex justify-end mt-4">
              <Button className="rounded-xl px-5 py-2 text-sm" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Submitting...' : 'Submit Profile'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export { DoctorSignupPage };



