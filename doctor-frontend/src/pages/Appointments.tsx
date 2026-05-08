import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

type AppointmentRow = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  day: string;
  date: string;
  time: string;
  notes: string | null;
  status: string;
};

type AppointmentListResponse = {
  total: number;
  items: AppointmentRow[];
};

type PatientOption = {
  patientId: string;
  name: string;
};

type PatientListResponse = {
  items: PatientOption[];
};

type DoctorOption = {
  userId: string;
  name: string;
};

type AppointmentForm = {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  notes: string;
};

const initialForm: AppointmentForm = {
  patientId: '',
  doctorId: '',
  date: '',
  time: '',
  notes: '',
};

const toTwelveHour = (value: string): string => {
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

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<AppointmentForm>(initialForm);
  const [formError, setFormError] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await api.get<AppointmentListResponse | AppointmentRow[]>('/doctor/appointments');
      const payload = response.data;
      if (Array.isArray(payload)) {
        setAppointments(payload);
      } else {
        setAppointments(payload?.items ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get<PatientListResponse>('/doctor/patients');
      setPatients(response.data.items ?? []);
    } catch (error) {
      console.error('Failed to fetch patients', error);
      setPatients([]);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get<DoctorOption[]>('/doctor/doctors');
      setDoctors(response.data ?? []);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
      setDoctors([]);
    }
  };

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
    void fetchDoctors();
  }, []);

  const doctorOptions = useMemo(() => {
    if (doctors.length > 0) return doctors;
    return [];
  }, [doctors]);

  const openModal = () => {
    setForm(initialForm);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
  };

  const handleFormChange =
    (field: keyof AppointmentForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setFormError('');
    };

  const handleCreateAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.patientId) {
      setFormError('Please select patient.');
      return;
    }
    if (!form.doctorId) {
      setFormError('Please select doctor.');
      return;
    }
    if (!form.date) {
      setFormError('Please select date.');
      return;
    }
    if (!form.time) {
      setFormError('Please select time.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/doctor/appointments', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        date: form.date,
        day: getDayFromDate(form.date),
        time: toTwelveHour(form.time),
        notes: form.notes.trim() || undefined,
      });
      setShowModal(false);
      await fetchAppointments();
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(error.response?.data?.message ?? 'Failed to create appointment.');
      } else {
        setFormError('Failed to create appointment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <button
          className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
          onClick={openModal}
          type="button"
        >
          + New Appointment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfd0c8] overflow-hidden">
        <table className="min-w-full divide-y divide-[#d7e2dd]">
          <thead className="bg-[#f4f8f6]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Patient</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Doctor</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Day</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Time</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#e0e9e4]">
            {loading ? (
              <tr>
                <td className="px-6 py-8 text-center text-[#6e847c] text-sm" colSpan={6}>Loading appointments...</td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-[#6e847c] text-sm" colSpan={6}>No appointments yet.</td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr className="hover:bg-[#f8fbf9]" key={appointment.appointmentId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.doctorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.day || appointment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded bg-green-100 text-green-800">
                      {appointment.status || 'Scheduled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900" type="button">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
          <div className="w-full max-w-[560px] rounded-[16px] bg-white border border-[#c8d7d1] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d6e1dc] px-6 py-5">
              <h3 className="text-[30px] font-semibold text-[#122c24]">New Appointment</h3>
              <button className="text-[#607d74] hover:text-[#1a3b31] text-2xl leading-none" onClick={closeModal} type="button">
                ×
              </button>
            </div>

            <form className="px-6 py-5 space-y-4" onSubmit={handleCreateAppointment}>
              <select
                className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                onChange={handleFormChange('patientId')}
                value={form.patientId}
              >
                <option value="">Select Patient *</option>
                {patients.map((patient) => (
                  <option key={patient.patientId} value={patient.patientId}>
                    {patient.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                onChange={handleFormChange('doctorId')}
                value={form.doctorId}
              >
                <option value="">Select Doctor *</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor.userId} value={doctor.userId}>
                    {doctor.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={handleFormChange('date')}
                  placeholder="Day *"
                  type="date"
                  value={form.date}
                />
                <input
                  className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={handleFormChange('time')}
                  placeholder="Time *"
                  type="time"
                  value={form.time}
                />
              </div>

              <textarea
                className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-100 min-h-[88px]"
                onChange={handleFormChange('notes')}
                placeholder="Notes"
                value={form.notes}
              />

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="mt-2 flex justify-end gap-3 border-t border-[#d6e1dc] pt-4">
                <button
                  className="rounded-xl border border-[#c8d7d1] px-6 py-3 text-sm font-semibold text-[#27483d] hover:bg-[#f4f8f6]"
                  onClick={closeModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-[#1faa62] px-6 py-3 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Booking...' : 'Book & Notify Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Appointments;
