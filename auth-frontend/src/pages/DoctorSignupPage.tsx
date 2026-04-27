import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
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

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin;
const doctorAppUrl = import.meta.env.VITE_DOCTOR_APP_URL ?? 'http://localhost:5175';

const initialDoctorForm: DoctorForm = {
  specialization: '',
  experience: '',
  qualification: '',
  clinicName: '',
  clinicAddress: '',
  city: '',
  consultationFees: '',
  availableDays: '',
  availableTimeSlots: '',
  aboutDoctor: '',
  profileImageUrl: '',
  certificateUrl: '',
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
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
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

          <form className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
            <div className="sm:col-span-2 flex items-center justify-between rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Step 1 of 2</span>
              <span>Professional details</span>
            </div>

            <InputField
              error={errors.specialization}
              label="Specialization"
              onChange={handleInput('specialization')}
              value={form.specialization}
            />
            <InputField
              error={errors.experience}
              label="Experience (years)"
              onChange={handleInput('experience')}
              type="number"
              value={form.experience}
            />
            <InputField
              error={errors.qualification}
              label="Qualification"
              onChange={handleInput('qualification')}
              value={form.qualification}
            />
            <InputField error={errors.clinicName} label="Clinic Name" onChange={handleInput('clinicName')} value={form.clinicName} />
            <InputField error={errors.city} label="City" onChange={handleInput('city')} value={form.city} />
            <InputField
              error={errors.clinicAddress}
              label="Clinic Address"
              onChange={handleInput('clinicAddress')}
              value={form.clinicAddress}
              wrapperClassName="sm:col-span-2"
            />
            <InputField
              error={errors.consultationFees}
              label="Consultation Fees"
              onChange={handleInput('consultationFees')}
              type="number"
              value={form.consultationFees}
            />
            <InputField
              error={errors.availableDays}
              label="Available Days"
              hint="Use comma-separated values like Monday, Tuesday, Friday"
              onChange={handleInput('availableDays')}
              value={form.availableDays}
            />
            <InputField
              error={errors.availableTimeSlots}
              label="Available Time Slots"
              hint="Use comma-separated values like 9:00 AM - 11:00 AM, 6:00 PM - 8:00 PM"
              onChange={handleInput('availableTimeSlots')}
              value={form.availableTimeSlots}
              wrapperClassName="sm:col-span-2"
            />
            <InputField
              label="Profile Image URL"
              onChange={handleInput('profileImageUrl')}
              value={form.profileImageUrl}
            />
            <InputField
              label="Certificate URL"
              onChange={handleInput('certificateUrl')}
              value={form.certificateUrl}
            />

            <label className="sm:col-span-2 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">About Doctor</span>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                onChange={handleInput('aboutDoctor')}
                placeholder="Share your care philosophy, expertise, and patient focus."
                value={form.aboutDoctor}
              />
            </label>

            {errors.form ? <p className="text-xs font-medium text-rose-500 sm:col-span-2">{errors.form}</p> : null}

            <div className="sm:col-span-2 flex justify-end">
              <Button className="rounded-2xl px-6" type="submit">
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
