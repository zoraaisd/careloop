import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/services/api';
import { X, Calendar as CalendarIcon, Clock, User, FileText } from 'lucide-react';

interface PatientOption {
  patientId: string;
  name: string;
  primaryDoctorId?: string | null;
}

interface DoctorOption {
  userId: string;
  name: string;
}

interface AppointmentOption {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  date: string;
  time: string;
  status: string;
}

interface SuggestedSlot {
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
}

type AppointmentListResponse = {
  total: number;
  items: AppointmentOption[];
};

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId?: string;
  initialDate?: string;
  initialTime?: string;
  initialPatientId?: string;
  initialDoctorId?: string;
  initialNotes?: string;
  initialStatus?: string;
}

const appointmentStatuses = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BUFFER_MINUTES = 10;

const toTwelveHour = (value: string): string => {
  if (value.includes('AM') || value.includes('PM')) return value;
  const [hh, mm] = value.split(':');
  const hour = Number(hh);
  if (!Number.isFinite(hour) || !mm) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${mm} ${period}`;
};

const getDayFromDate = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const toTwentyFourHour = (value: string): string => {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return value;

  const [, rawHour, minutes, period] = match;
  let hour = Number(rawHour);
  if (period.toUpperCase() === 'AM') {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return `${String(hour).padStart(2, '0')}:${minutes}`;
};

const toMinutes = (value: string): number | null => {
  const normalized = toTwentyFourHour(value);
  const [hh, mm] = normalized.split(':');
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const toTimeLabel = (minutes: number): string => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
};

const isSlotBlocked = (
  appointments: AppointmentOption[],
  doctorId: string,
  date: string,
  time: string,
  currentAppointmentId?: string,
): boolean => {
  const requestedMinutes = toMinutes(time);
  if (requestedMinutes === null) {
    return true;
  }

  return appointments.some((appointment) => {
    if (
      appointment.doctorId !== doctorId ||
      appointment.date !== date ||
      appointment.appointmentId === currentAppointmentId ||
      appointment.status === 'cancelled'
    ) {
      return false;
    }

    const appointmentMinutes = toMinutes(appointment.time);
    if (appointmentMinutes === null) {
      return false;
    }

    return Math.abs(appointmentMinutes - requestedMinutes) < BUFFER_MINUTES;
  });
};

const getConflictWarning = (
  appointments: AppointmentOption[],
  form: {
    doctorId: string;
    date: string;
    time: string;
  },
  currentAppointmentId?: string,
): string => {
  if (!form.doctorId || !form.date || !form.time) {
    return '';
  }

  const requestedMinutes = toMinutes(form.time);
  if (requestedMinutes === null) {
    return '';
  }

  const activeAppointments = appointments.filter((appointment) => {
    return (
      appointment.doctorId === form.doctorId &&
      appointment.date === form.date &&
      appointment.appointmentId !== currentAppointmentId &&
      appointment.status !== 'cancelled'
    );
  });

  for (const appointment of activeAppointments) {
    const appointmentMinutes = toMinutes(appointment.time);
    if (appointmentMinutes === null) {
      continue;
    }

    const diff = Math.abs(appointmentMinutes - requestedMinutes);
    if (diff === 0) {
      return `${appointment.time} already booked for ${appointment.patientName}.`;
    }

    if (diff < BUFFER_MINUTES) {
      return `${toTwelveHour(form.time)} unavailable. Buffer time protected around ${appointment.patientName}'s ${appointment.time} appointment.`;
    }
  }

  return '';
};

const getSuggestedSlots = (
  appointments: AppointmentOption[],
  doctors: DoctorOption[],
  form: {
    doctorId: string;
    date: string;
    time: string;
  },
  currentAppointmentId?: string,
): {
  sameDoctor: SuggestedSlot[];
  otherDoctors: SuggestedSlot[];
} => {
  if (!form.date || !form.time) {
    return { sameDoctor: [], otherDoctors: [] };
  }

  const startMinutes = toMinutes(form.time);
  if (startMinutes === null) {
    return { sameDoctor: [], otherDoctors: [] };
  }

  const candidateMinutes: number[] = [];
  for (let minutes = Math.max(startMinutes, 9 * 60); minutes <= 17 * 60; minutes += 10) {
    candidateMinutes.push(minutes);
  }

  const sameDoctor = candidateMinutes
    .map((minutes) => ({
      doctorId: form.doctorId,
      doctorName: doctors.find((doctor) => doctor.userId === form.doctorId)?.name ?? 'Selected Doctor',
      date: form.date,
      time: toTimeLabel(minutes),
    }))
    .filter((slot) => slot.doctorId)
    .filter((slot) => !isSlotBlocked(appointments, slot.doctorId, slot.date, slot.time, currentAppointmentId))
    .slice(0, 3);

  const otherDoctors = doctors
    .filter((doctor) => doctor.userId !== form.doctorId)
    .flatMap((doctor) =>
      candidateMinutes
        .map((minutes) => ({
          doctorId: doctor.userId,
          doctorName: doctor.name,
          date: form.date,
          time: toTimeLabel(minutes),
        }))
        .filter((slot) => !isSlotBlocked(appointments, slot.doctorId, slot.date, slot.time, currentAppointmentId))
        .slice(0, 1),
    )
    .slice(0, 3);

  return { sameDoctor, otherDoctors };
};

const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ 
  isOpen,
  onClose,
  onSuccess,
  appointmentId,
  initialDate = '',
  initialTime = '',
  initialPatientId = '',
  initialDoctorId = '',
  initialNotes = '',
  initialStatus = 'scheduled',
}) => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    patientId: initialPatientId,
    doctorId: initialDoctorId,
    date: initialDate,
    time: initialTime,
    notes: initialNotes,
    status: initialStatus,
  });

  const isEditing = Boolean(appointmentId);
  const conflictWarning = getConflictWarning(appointments, form, appointmentId);
  const suggestedSlots = conflictWarning
    ? getSuggestedSlots(appointments, doctors, form, appointmentId)
    : { sameDoctor: [], otherDoctors: [] };

  useEffect(() => {
    if (!conflictWarning) {
      setFormError((current) =>
        current.includes('already booked') || current.includes('Buffer time protected')
          ? ''
          : current,
      );
    }
  }, [conflictWarning]);

  useEffect(() => {
    if (isOpen) {
      setForm({
        patientId: initialPatientId,
        doctorId: initialDoctorId,
        date: initialDate,
        time: initialTime,
        notes: initialNotes,
        status: initialStatus,
      });
      setFormError('');
      fetchData();
    }
  }, [isOpen, initialDate, initialDoctorId, initialNotes, initialPatientId, initialStatus, initialTime]);

  const fetchData = async () => {
    try {
      const [pRes, dRes, aRes] = await Promise.all([
        api.get('/doctor/patients'),
        api.get('/doctor/doctors'),
        api.get('/doctor/appointments'),
      ]);
      setPatients(pRes.data.items ?? []);
      setDoctors(dRes.data ?? []);
      const appointmentPayload = aRes.data as AppointmentListResponse | AppointmentOption[];
      setAppointments(Array.isArray(appointmentPayload) ? appointmentPayload : appointmentPayload?.items ?? []);
    } catch (error) {
      console.error('Failed to fetch modal data', error);
    }
  };

  useEffect(() => {
    if (!form.patientId || doctors.length === 0) {
      return;
    }

    const selectedPatient = patients.find((patient) => patient.patientId === form.patientId);
    const assignedDoctorId = selectedPatient?.primaryDoctorId;

    if (!assignedDoctorId) {
      return;
    }

    const doctorExists = doctors.some((doctor) => doctor.userId === assignedDoctorId);
    if (!doctorExists || form.doctorId === assignedDoctorId) {
      return;
    }

    setForm((current) => ({
      ...current,
      doctorId: assignedDoctorId,
    }));
  }, [doctors, form.doctorId, form.patientId, patients]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.date || !form.time) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (conflictWarning) {
      setFormError(conflictWarning);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        time: toTwelveHour(form.time),
        day: getDayFromDate(form.date),
        notes: form.notes.trim() || undefined,
      };

      if (appointmentId) {
        await api.patch(`/doctor/appointments/${appointmentId}`, payload);
      } else {
        await api.post('/doctor/appointments', payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(error.response?.data?.message ?? 'Failed to create appointment.');
      } else {
        setFormError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-[520px] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h3 className="text-2xl font-black text-[#1e293b]">{isEditing ? 'Edit Visit' : 'Schedule Visit'}</h3>
            <p className="text-sm text-slate-500 font-medium">
              {isEditing ? 'Update this patient appointment' : 'Book a new patient appointment'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleCreateAppointment} className="p-8 space-y-5">
          {conflictWarning && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {conflictWarning}
            </div>
          )}

          {formError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600 animate-shake">
              {formError}
            </div>
          )}

          {/* Patient Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="h-3 w-3" /> Patient Selection
            </label>
            <select
              className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
              value={form.patientId}
              onChange={e => {
                const nextPatientId = e.target.value;
                const selectedPatient = patients.find((patient) => patient.patientId === nextPatientId);
                const assignedDoctorId = selectedPatient?.primaryDoctorId ?? '';

                setForm({
                  ...form,
                  patientId: nextPatientId,
                  doctorId:
                    assignedDoctorId && doctors.some((doctor) => doctor.userId === assignedDoctorId)
                      ? assignedDoctorId
                      : '',
                });
              }}
            >
              <option value="">Select Patient *</option>
              {patients.map(p => <option key={p.patientId} value={p.patientId}>{p.name}</option>)}
            </select>
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="h-3 w-3" /> Assign Doctor
            </label>
            <select
              className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
              value={form.doctorId}
              onChange={e => setForm({...form, doctorId: e.target.value})}
            >
              <option value="">Select Doctor *</option>
              {doctors.map(d => <option key={d.userId} value={d.userId}>{d.name}</option>)}
            </select>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> Status
              </label>
              <select
                className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
              >
                {appointmentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> Date
              </label>
              <input
                type="date"
                className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> Time
              </label>
              <input
                type="time"
                className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                value={form.time}
                onChange={e => setForm({...form, time: e.target.value})}
              />
            </div>
          </div>

          {conflictWarning && (suggestedSlots.sameDoctor.length > 0 || suggestedSlots.otherDoctors.length > 0) && (
            <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Suggested Slots</p>
                <p className="mt-1 text-sm font-semibold text-amber-900">Pick the next available option instead.</p>
              </div>

              {suggestedSlots.sameDoctor.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Same Doctor</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSlots.sameDoctor.map((slot) => (
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1faa62] ring-1 ring-[#cfe6d8]"
                        key={`${slot.doctorId}-${slot.date}-${slot.time}`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            doctorId: slot.doctorId,
                            date: slot.date,
                            time: toTwentyFourHour(slot.time),
                          }))
                        }
                        type="button"
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {suggestedSlots.otherDoctors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Other Doctors</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSlots.otherDoctors.map((slot) => (
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-700 ring-1 ring-sky-100"
                        key={`${slot.doctorId}-${slot.date}-${slot.time}`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            doctorId: slot.doctorId,
                            date: slot.date,
                            time: toTwentyFourHour(slot.time),
                          }))
                        }
                        type="button"
                      >
                        {slot.doctorName} • {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-3 w-3" /> Notes (Optional)
            </label>
            <textarea
              className="w-full h-24 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
              placeholder="Add any specific instructions..."
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(conflictWarning)}
              className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (isEditing ? 'Saving...' : 'Scheduling...') : (isEditing ? 'Save Changes' : 'Confirm Appointment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookAppointmentModal;
