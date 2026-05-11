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

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialTime?: string;
  initialPatientId?: string;
}

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

const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ 
  isOpen, onClose, onSuccess, initialDate = '', initialTime = '', initialPatientId = '' 
}) => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    patientId: initialPatientId,
    doctorId: '',
    date: initialDate,
    time: initialTime,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        patientId: initialPatientId || prev.patientId,
        date: initialDate || prev.date,
        time: initialTime || prev.time
      }));
      fetchData();
    }
  }, [isOpen, initialDate, initialTime, initialPatientId]);

  const fetchData = async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        api.get('/doctor/patients'),
        api.get('/doctor/doctors')
      ]);
      setPatients(pRes.data.items ?? []);
      setDoctors(dRes.data ?? []);
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

    setIsSubmitting(true);
    try {
      await api.post('/doctor/appointments', {
        ...form,
        time: toTwelveHour(form.time),
        day: getDayFromDate(form.date),
        notes: form.notes.trim() || undefined,
      });
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
            <h3 className="text-2xl font-black text-[#1e293b]">Schedule Visit</h3>
            <p className="text-sm text-slate-500 font-medium">Book a new patient appointment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleCreateAppointment} className="p-8 space-y-5">
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

          {formError && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-sm font-bold animate-shake">
              {formError}
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookAppointmentModal;
