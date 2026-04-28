import axios from 'axios';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { apiClient } from '@/services/api';
import { saveAuthSession, type AuthRole } from '@/services/auth-storage';

type SignupResponse = {
  token: string;
  role: AuthRole;
  userId: string;
  message: string;
};

type BasicDetails = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  signupVerificationToken: string;
};

type DoctorProfessionalDetails = {
  specialization: string;
  experience: string;
  qualification: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  consultationFees: string;
  availableDays: string;
  availableTimeSlots: string;
  aboutDoctor: string;
  profileImageUrl: string;
  certificateUrl: string;
};

type CouncilForm = {
  medicalRegistrationNumber: string;
  medicalCouncilBoard: string;
  councilRegisteredName: string;
  dateOfBirth: string;
};

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

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin;
const doctorAppUrl = import.meta.env.VITE_DOCTOR_APP_URL ?? 'http://localhost:5175';

const DoctorCouncilVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    | {
        basicDetails?: BasicDetails;
        doctorProfessionalDetails?: DoctorProfessionalDetails;
      }
    | null;
  const basicDetails = state?.basicDetails;
  const doctorProfessionalDetails = state?.doctorProfessionalDetails;
  const [form, setForm] = useState<CouncilForm>({
    medicalRegistrationNumber: '',
    medicalCouncilBoard: '',
    councilRegisteredName: basicDetails?.name ?? '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const hasRequiredState = useMemo(
    () =>
      Boolean(
        basicDetails?.name &&
          basicDetails.email &&
          basicDetails.phone &&
          basicDetails.password &&
          basicDetails.confirmPassword &&
          basicDetails.signupVerificationToken &&
          doctorProfessionalDetails?.specialization &&
          doctorProfessionalDetails.experience &&
          doctorProfessionalDetails.qualification &&
          doctorProfessionalDetails.clinicName &&
          doctorProfessionalDetails.clinicAddress &&
          doctorProfessionalDetails.city &&
          doctorProfessionalDetails.consultationFees &&
          doctorProfessionalDetails.availableDays &&
          doctorProfessionalDetails.availableTimeSlots,
      ),
    [basicDetails, doctorProfessionalDetails],
  );

  const handleInput =
    (field: keyof CouncilForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        delete nextErrors.form;
        return nextErrors;
      });
    };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof CouncilForm> = [
      'medicalRegistrationNumber',
      'medicalCouncilBoard',
      'councilRegisteredName',
      'dateOfBirth',
    ];

    requiredFields.forEach((field) => {
      if (!form[field].trim()) {
        nextErrors[field] = 'This field is required.';
      }
    });

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasRequiredState || !basicDetails || !doctorProfessionalDetails) {
      navigate('/doctor-signup');
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<SignupResponse>('/auth/signup', {
        ...basicDetails,
        role: 'doctor',
        signupVerificationToken: basicDetails.signupVerificationToken,
        doctorProfile: {
          specialization: doctorProfessionalDetails.specialization.trim(),
          experience: Number(doctorProfessionalDetails.experience),
          qualification: doctorProfessionalDetails.qualification.trim(),
          clinicName: doctorProfessionalDetails.clinicName.trim(),
          clinicAddress: doctorProfessionalDetails.clinicAddress.trim(),
          city: doctorProfessionalDetails.city.trim(),
          consultationFees: Number(doctorProfessionalDetails.consultationFees),
          availableDays: doctorProfessionalDetails.availableDays
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          availableTimeSlots: doctorProfessionalDetails.availableTimeSlots
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          aboutDoctor: doctorProfessionalDetails.aboutDoctor.trim() || undefined,
          profileImageUrl: doctorProfessionalDetails.profileImageUrl.trim() || undefined,
          certificateUrl: doctorProfessionalDetails.certificateUrl.trim() || undefined,
          medicalRegistrationNumber: form.medicalRegistrationNumber.trim(),
          medicalCouncilBoard: form.medicalCouncilBoard.trim(),
          councilRegisteredName: form.councilRegisteredName.trim(),
          dateOfBirth: form.dateOfBirth,
        },
      });

      saveAuthSession(data);
      window.localStorage.setItem('careloop.auth.appUrl', authAppUrl);
      window.localStorage.setItem('meditracker.auth.appUrl', authAppUrl);
      setSuccessMessage('Doctor profile submitted. Redirecting to your workspace...');
      window.setTimeout(() => {
        const params = new URLSearchParams({
          token: data.token,
          role: data.role,
          userId: data.userId,
        });
        window.location.assign(`${doctorAppUrl}/doctor/dashboard?${params.toString()}`);
      }, 700);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Doctor signup failed. Please try again.'
        : 'Doctor signup failed. Please try again.';

      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasRequiredState || !basicDetails || !doctorProfessionalDetails) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Care Loop</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Start from doctor details</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Complete the professional details page first, then continue to council verification.
          </p>
          <div className="mt-6">
            <Button className="rounded-2xl px-6" onClick={() => navigate('/doctor-signup')} type="button">
              Back to doctor details
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Doctor onboarding</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Additional doctor details</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                Add the doctor details you want to save and show in the admin panel.
              </p>
            </div>
            <Link className="text-sm font-semibold text-[#15803D]" to="/doctor-signup">
              Back to professional details
            </Link>
          </div>

          <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">Account summary</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <p><span className="font-semibold text-slate-900">Name:</span> {basicDetails.name}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {basicDetails.email}</p>
              <p><span className="font-semibold text-slate-900">Phone:</span> {basicDetails.phone}</p>
            </div>
          </div>

          <form className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
            <div className="sm:col-span-2 flex items-center justify-between rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Step 2 of 2</span>
              <span>Additional doctor details</span>
            </div>

            <InputField
              error={errors.medicalRegistrationNumber}
              label="Council Number"
              onChange={handleInput('medicalRegistrationNumber')}
              value={form.medicalRegistrationNumber}
            />

            <label className="block sm:col-span-1" htmlFor="medical-council-board">
              <span className="mb-2 block text-sm font-medium text-slate-700">Council Board</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                id="medical-council-board"
                onChange={handleInput('medicalCouncilBoard')}
                value={form.medicalCouncilBoard}
              >
                <option value="">Select council board</option>
                {medicalCouncilBoards.map((board) => (
                  <option key={board} value={board}>
                    {board}
                  </option>
                ))}
              </select>
              {errors.medicalCouncilBoard ? (
                <span className="mt-2 block text-xs font-medium text-rose-500">{errors.medicalCouncilBoard}</span>
              ) : null}
            </label>

            <InputField error={errors.dateOfBirth} label="DOB" onChange={handleInput('dateOfBirth')} type="date" value={form.dateOfBirth} />
            <InputField
              error={errors.councilRegisteredName}
              label="Name"
              onChange={handleInput('councilRegisteredName')}
              value={form.councilRegisteredName}
            />

            {errors.form ? <p className="text-xs font-medium text-rose-500 sm:col-span-2">{errors.form}</p> : null}
            {successMessage ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
                {successMessage}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button
                className="rounded-2xl px-6"
                disabled={isSubmitting}
                onClick={() =>
                  navigate('/doctor-signup', {
                    state: {
                      basicDetails,
                      doctorProfessionalDetails,
                    },
                  })
                }
                type="button"
                variant="secondary"
              >
                Back
              </Button>
              <Button className="rounded-2xl px-6" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Submitting...' : 'Submit doctor profile'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export { DoctorCouncilVerificationPage };
