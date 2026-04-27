import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button, LinkButton } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import {
  createPublicAppointment,
  getApprovedDoctorAvailability,
  getApprovedDoctorById,
  getApprovedDoctorRouteId,
  resolvePublicDoctorId,
  type ApprovedDoctor,
  type ApprovedDoctorAvailabilitySlot,
} from '@/services/public-doctors';

type BookingFormState = {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientAge: string;
  patientGender: string;
  slotId: string;
  notes: string;
};

type SlotGroup = {
  key: string;
  date: string;
  day: string;
  dateObject: Date | null;
  slots: ApprovedDoctorAvailabilitySlot[];
};

type CalendarCell = {
  key: string;
  dayNumber: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isAvailable: boolean;
};

const initialFormState: BookingFormState = {
  patientName: '',
  patientPhone: '',
  patientEmail: '',
  patientAge: '',
  patientGender: '',
  slotId: '',
  notes: '',
};

const bookingSteps = [
  { id: '1', title: 'Doctor', subtitle: 'Review clinic details' },
  { id: '2', title: 'Slot', subtitle: 'Choose date and time' },
  { id: '3', title: 'Patient', subtitle: 'Enter patient details' },
  { id: '4', title: 'Confirm', subtitle: 'Review and submit' },
] as const;

const bookingStepTargets = ['doctor-section', 'slot-section', 'patient-section', 'confirm-section'] as const;

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

const formatDisplayText = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parseSlotDate = (value: string): Date | null => {
  const direct = new Date(value);

  if (!Number.isNaN(direct.getTime())) {
    return new Date(direct.getFullYear(), direct.getMonth(), direct.getDate());
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const reversed = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (reversed) {
    return new Date(Number(reversed[3]), Number(reversed[2]) - 1, Number(reversed[1]));
  }

  return null;
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);

const formatLongDate = (date: Date | null, fallback: string) =>
  date
    ? new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date)
    : fallback;

const buildCalendarCells = (month: Date, availableDateKeys: Set<string>): CalendarCell[] => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(current);

    return {
      key: `${dateKey}-${index}`,
      dayNumber: current.getDate(),
      dateKey,
      isCurrentMonth: current.getMonth() === month.getMonth(),
      isAvailable: availableDateKeys.has(dateKey),
    };
  });
};

const BookAppointmentPage = () => {
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<ApprovedDoctor | null>(null);
  const [slots, setSlots] = useState<ApprovedDoctorAvailabilitySlot[]>([]);
  const [resolvedDoctorId, setResolvedDoctorId] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState<BookingFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const profileRouteId = doctor ? getApprovedDoctorRouteId(doctor) : doctorId;
  const hasPatientCoreDetails = Boolean(form.patientName.trim() && form.patientPhone.trim() && form.patientAge.trim());

  useEffect(() => {
    const loadBookingContext = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const publicDoctorId = await resolvePublicDoctorId(doctorId);
        const [doctorResponse, slotsResponse] = await Promise.all([
          getApprovedDoctorById(publicDoctorId),
          getApprovedDoctorAvailability(publicDoctorId),
        ]);

        setResolvedDoctorId(publicDoctorId);
        setDoctor(doctorResponse);
        setSlots(slotsResponse);
      } catch (error) {
        setResolvedDoctorId('');
        setDoctor(null);
        setSlots([]);
        if (axios.isAxiosError<{ message?: string }>(error) && error.response?.status === 404) {
          setErrorMessage('Doctor not found');
        } else if (!axios.isAxiosError(error) && error instanceof Error) {
          setErrorMessage('Doctor not found');
        } else {
          setErrorMessage('Unable to load this booking page right now.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorId) {
      void loadBookingContext();
      return;
    }

    setDoctor(null);
    setSlots([]);
    setResolvedDoctorId('');
    setErrorMessage('Doctor not found');
    setIsLoading(false);
  }, [doctorId]);

  const slotGroups = useMemo<SlotGroup[]>(() => {
    const grouped = new Map<string, SlotGroup>();

    for (const slot of slots) {
      const dateObject = parseSlotDate(slot.date);
      const key = dateObject ? toDateKey(dateObject) : `${slot.day}-${slot.date}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.slots.push(slot);
        continue;
      }

      grouped.set(key, {
        key,
        date: slot.date,
        day: slot.day,
        dateObject,
        slots: [slot],
      });
    }

    return Array.from(grouped.values()).sort((left, right) => {
      if (left.dateObject && right.dateObject) {
        return left.dateObject.getTime() - right.dateObject.getTime();
      }

      return left.key.localeCompare(right.key);
    });
  }, [slots]);

  const availableDateKeys = useMemo(() => new Set(slotGroups.map((group) => group.key)), [slotGroups]);

  const monthOptions = useMemo(() => {
    const unique = new Map<string, Date>();

    for (const group of slotGroups) {
      if (!group.dateObject) {
        continue;
      }

      const monthDate = new Date(group.dateObject.getFullYear(), group.dateObject.getMonth(), 1);
      unique.set(`${monthDate.getFullYear()}-${monthDate.getMonth()}`, monthDate);
    }

    return Array.from(unique.values()).sort((left, right) => left.getTime() - right.getTime());
  }, [slotGroups]);

  const activeGroup = slotGroups.find((group) => group.key === selectedDateKey) ?? slotGroups[0] ?? null;
  const activeDateSlots = activeGroup?.slots ?? [];

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slotId === form.slotId) ?? null,
    [form.slotId, slots],
  );
  const hasGeneratedSlots = useMemo(() => slots.some((slot) => slot.isGenerated), [slots]);
  const nextAvailableSlot = slots[0] ?? null;
  const activeStepIndex = successMessage
    ? 3
    : !form.slotId
      ? 1
      : !hasPatientCoreDetails
        ? 2
        : 3;

  const selectedSlotDate = selectedSlot ? parseSlotDate(selectedSlot.date) : null;
  const selectedMonthIndex = monthOptions.findIndex(
    (month) => month.getFullYear() === currentMonth.getFullYear() && month.getMonth() === currentMonth.getMonth(),
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(currentMonth, availableDateKeys),
    [availableDateKeys, currentMonth],
  );

  useEffect(() => {
    if (slotGroups.length === 0) {
      setSelectedDateKey('');
      setForm((current) => ({ ...current, slotId: '' }));
      return;
    }

    setSelectedDateKey((current) => (availableDateKeys.has(current) ? current : slotGroups[0].key));
  }, [availableDateKeys, slotGroups]);

  useEffect(() => {
    if (!activeGroup) {
      return;
    }

    if (activeGroup.dateObject) {
      setCurrentMonth(new Date(activeGroup.dateObject.getFullYear(), activeGroup.dateObject.getMonth(), 1));
    }

    setForm((current) => {
      if (activeDateSlots.some((slot) => slot.slotId === current.slotId)) {
        return current;
      }

      return {
        ...current,
        slotId: activeDateSlots[0]?.slotId || '',
      };
    });
  }, [activeDateSlots, activeGroup]);

  const handleChange =
    (field: keyof BookingFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let value = event.target.value;

      if (field === 'patientPhone') {
        value = value.replace(/\D/g, '').slice(0, 10);
      }

      if (field === 'patientAge') {
        value = value.replace(/\D/g, '').slice(0, 3);
      }

      setForm((current) => ({ ...current, [field]: value }));
      setErrorMessage('');
      setSuccessMessage('');
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.slotId) {
      setErrorMessage('Please choose an available appointment slot.');
      return;
    }

    if (!resolvedDoctorId) {
      setErrorMessage('Doctor not found');
      return;
    }

    if (!form.patientName.trim() || !form.patientPhone.trim() || !form.patientAge.trim()) {
      setErrorMessage('Please fill in your name, phone number, and age.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await createPublicAppointment(resolvedDoctorId, {
        slotId: form.slotId,
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        patientEmail: form.patientEmail.trim() || undefined,
        patientAge: Number(form.patientAge),
        patientGender: form.patientGender.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setSuccessMessage(response.message);

      const freshSlots = await getApprovedDoctorAvailability(resolvedDoctorId);
      setSlots(freshSlots);
      setForm({
        ...initialFormState,
        slotId: '',
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Unable to book the appointment right now.'
        : 'Unable to book the appointment right now.';

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const doctorName = doctor ? formatDisplayText(doctor.name) : '';
  const clinicName = doctor ? formatDisplayText(doctor.clinicName) : '';
  const doctorCity = doctor?.city ? formatDisplayText(doctor.city) : 'Not provided';
  const doctorQualification = doctor?.qualification ? formatDisplayText(doctor.qualification) : '';
  const doctorAbout = doctor?.aboutDoctor?.trim() ? doctor.aboutDoctor.trim() : '';
  const nextAvailableDate = nextAvailableSlot ? parseSlotDate(nextAvailableSlot.date) : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-lg">
            Loading booking details...
          </div>
        ) : errorMessage && !doctor ? (
          <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-lg">
            {errorMessage}
          </div>
        ) : doctor ? (
          <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:p-6">
            <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-5 sm:px-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {bookingSteps.map((step, index) => {
                  const isActive = index === activeStepIndex;
                  const isComplete = index < activeStepIndex;

                  return (
                    <button
                      className="flex cursor-pointer items-start gap-4 rounded-[20px] px-2 py-2 text-left transition hover:bg-white/80"
                      key={step.id}
                      onClick={() => {
                        document.getElementById(bookingStepTargets[index])?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }}
                      type="button"
                    >
                      <div
                        className={[
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                          isActive
                            ? 'border-[#16A34A] bg-[#16A34A] text-white'
                            : isComplete
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500',
                        ].join(' ')}
                      >
                        {isComplete ? '✓' : step.id}
                      </div>
                      <div className="min-w-0">
                        <p className={['text-lg font-semibold', isActive ? 'text-slate-950' : 'text-slate-900'].join(' ')}>
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{step.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(360px,0.94fr)]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div id="doctor-section" />
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#16A34A]">Selected Doctor</p>

                <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 text-3xl font-bold text-emerald-700">
                      {doctor.profileImageUrl ? (
                        <img
                          alt={doctorName}
                          className="h-full w-full object-cover"
                          src={doctor.profileImageUrl}
                        />
                      ) : (
                        doctorName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 pt-1">
                      <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.1rem]">
                        {doctorName}
                      </h1>
                      <p className="mt-2 break-words text-xl text-slate-500">
                        {doctor.specialization}
                        {doctorQualification ? (
                          <>
                            <span className="mx-2 text-slate-300">|</span>
                            {doctorQualification}
                          </>
                        ) : null}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                          {doctor.experience}+ years experience
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                          {slots.length > 0
                            ? `${slots.length} public slot${slots.length === 1 ? '' : 's'}`
                            : 'No public slots'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-5 py-4 lg:min-w-[180px]">
                    <p className="text-right text-3xl font-bold leading-none text-emerald-700">
                      {formatCurrency(doctor.consultationFees)}
                    </p>
                    <p className="mt-2 text-right text-sm font-medium text-emerald-700">Consultation fee</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">Clinic</p>
                    <p className="mt-2 break-words text-lg font-semibold text-slate-900">{clinicName}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{doctor.clinicAddress || doctorCity}</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">Next free slot</p>
                    <p className="mt-2 break-words text-lg font-semibold text-slate-900">
                      {nextAvailableSlot ? nextAvailableSlot.time : 'No free slot'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {nextAvailableSlot
                        ? formatLongDate(nextAvailableDate, `${nextAvailableSlot.day}, ${nextAvailableSlot.date}`)
                        : doctorCity}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Availability</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{slots.length}</p>
                    <p className="mt-1 text-sm text-slate-600">Free slot{slots.length === 1 ? '' : 's'} open to book</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Schedule Mode</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {hasGeneratedSlots ? 'Auto-generated' : 'Published'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {hasGeneratedSlots ? 'Built from the doctor weekly free time' : 'Using directly published slot rows'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">City</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{doctorCity}</p>
                    <p className="mt-1 text-sm text-slate-600">Consultation at {clinicName}</p>
                  </div>
                </div>

                {doctorAbout ? (
                  <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">About</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{doctorAbout}</p>
                  </div>
                ) : null}

                <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div>
                    <div id="slot-section" />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#16A34A]">Choose Date</p>
                      <span className="text-xs font-medium text-slate-500">
                        {hasGeneratedSlots ? 'Live from weekly schedule' : 'Real availability'}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={selectedMonthIndex <= 0}
                          onClick={() => {
                            if (selectedMonthIndex > 0) {
                              setCurrentMonth(monthOptions[selectedMonthIndex - 1]);
                            }
                          }}
                          type="button"
                        >
                          {'<'}
                        </button>
                        <p className="text-xl font-semibold text-slate-900">{formatMonthLabel(currentMonth)}</p>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={selectedMonthIndex < 0 || selectedMonthIndex >= monthOptions.length - 1}
                          onClick={() => {
                            if (selectedMonthIndex >= 0 && selectedMonthIndex < monthOptions.length - 1) {
                              setCurrentMonth(monthOptions[selectedMonthIndex + 1]);
                            }
                          }}
                          type="button"
                        >
                          {'>'}
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-7 gap-2 text-center">
                        {weekdayLabels.map((label) => (
                          <div className="pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" key={label}>
                            {label}
                          </div>
                        ))}

                        {calendarCells.map((cell) => {
                          const isSelected = cell.dateKey === activeGroup?.key;

                          return (
                            <button
                              className={[
                                'flex h-10 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition disabled:cursor-not-allowed',
                                cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-300',
                                cell.isAvailable ? 'hover:bg-emerald-50 hover:text-emerald-700' : 'cursor-default',
                                isSelected ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]' : '',
                              ].join(' ')}
                              disabled={!cell.isAvailable}
                              key={cell.key}
                              onClick={() => setSelectedDateKey(cell.dateKey)}
                              type="button"
                            >
                              {cell.dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                      Only dates with live free slots from the doctor schedule are selectable.
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#16A34A]">Available Slots</p>
                        <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">
                          {activeGroup
                            ? formatLongDate(activeGroup.dateObject, `${activeGroup.day}, ${activeGroup.date}`)
                            : 'Select a date'}
                        </p>
                      </div>
                      {activeGroup ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                          {activeDateSlots.length} slot{activeDateSlots.length === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {activeDateSlots.length > 0 ? (
                        activeDateSlots.map((slot) => (
                          <button
                            className={[
                              'min-h-[84px] cursor-pointer rounded-[18px] border px-4 py-4 text-center text-lg font-semibold leading-tight transition',
                              form.slotId === slot.slotId
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700',
                            ].join(' ')}
                            key={slot.slotId}
                            onClick={() => setForm((current) => ({ ...current, slotId: slot.slotId }))}
                            type="button"
                          >
                            <span className="block">{slot.time}</span>
                            <span className="mt-2 block text-xs font-medium uppercase tracking-[0.14em] text-current/70">
                              {slot.isGenerated ? 'Weekly free slot' : 'Published slot'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 sm:col-span-2">
                          No free booking slots are available for this doctor right now.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div id="patient-section" />
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#16A34A]">Patient Information</p>

                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
                      <input
                        className="w-full rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                        onChange={handleChange('patientName')}
                        placeholder="Enter patient full name"
                        value={form.patientName}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Phone number</span>
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-slate-200 focus-within:border-[#16A34A] focus-within:ring-4 focus-within:ring-green-100">
                        <div className="flex items-center justify-center border-r border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                          +91
                        </div>
                        <input
                          className="border-0 px-4 py-4 text-sm text-slate-900 outline-none"
                          onChange={handleChange('patientPhone')}
                          placeholder="10-digit phone number"
                          value={form.patientPhone}
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                      <input
                        className="w-full rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                        onChange={handleChange('patientEmail')}
                        placeholder="Optional email address"
                        type="email"
                        value={form.patientEmail}
                      />
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Age</span>
                        <input
                          className="w-full rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                          onChange={handleChange('patientAge')}
                          placeholder="Age"
                          value={form.patientAge}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Gender</span>
                        <select
                          className="w-full rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                          onChange={handleChange('patientGender')}
                          value={form.patientGender}
                        >
                          <option value="">Select</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Symptoms or reason for visit</span>
                      <textarea
                        className="min-h-32 w-full rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
                        onChange={handleChange('notes')}
                        placeholder="Describe symptoms, concerns, or the purpose of the visit"
                        value={form.notes}
                      />
                    </label>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                    <div id="confirm-section" />
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#16A34A]">Appointment Summary</p>

                    <div className="mt-5 space-y-4 text-sm text-slate-600">
                      <div className="flex items-start justify-between gap-4">
                        <span>Doctor</span>
                        <span className="text-right font-semibold text-slate-900">{doctorName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Specialization</span>
                        <span className="text-right font-semibold text-slate-900">{doctor.specialization}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Clinic</span>
                        <span className="text-right font-semibold text-slate-900">{clinicName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Date</span>
                        <span className="text-right font-semibold text-slate-900">
                          {selectedSlot
                            ? formatLongDate(selectedSlotDate, `${selectedSlot.day}, ${selectedSlot.date}`)
                            : 'Choose a slot'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Time</span>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{selectedSlot?.time || 'Choose a slot'}</p>
                          {selectedSlot?.isGenerated ? (
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
                              Auto-built from doctor free time
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span>Fee</span>
                        <span className="text-right font-semibold text-slate-900">
                          {formatCurrency(doctor.consultationFees)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3 text-lg font-bold text-emerald-700">
                        <span>Total</span>
                        <span>{formatCurrency(doctor.consultationFees)}</span>
                      </div>
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="rounded-[18px] border border-rose-100 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
                      {errorMessage}
                    </p>
                  ) : null}

                  {successMessage ? (
                    <p className="rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                      {successMessage}
                    </p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <Button
                      className="min-h-[58px] rounded-[18px] px-6 text-base"
                      disabled={isSubmitting || !form.slotId}
                      type="submit"
                    >
                      {isSubmitting ? 'Confirming appointment...' : 'Confirm Appointment'}
                    </Button>
                    <LinkButton
                      className="min-h-[58px] rounded-[18px] px-6 text-base"
                      to={`/doctors/${profileRouteId}`}
                      variant="secondary"
                    >
                      View Doctor Profile
                    </LinkButton>
                  </div>

                  <p className="text-sm text-slate-500">
                    By confirming, you agree to the booking details shown above.
                  </p>
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export { BookAppointmentPage };
