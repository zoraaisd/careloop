import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { X } from 'lucide-react';
import BookAppointmentModal from '../appointments/BookAppointmentModal';

interface PatientSlotsModalProps {
  patient: {
    patientId: string;
    name: string;
  };
  onClose: () => void;
}

interface Appointment {
  id: string;
  appointmentTime?: string;
  date?: string;
  time?: string;
  day?: string;
  patientName: string;
  doctorName: string;
  status: string;
}

const PatientSlotsModal: React.FC<PatientSlotsModalProps> = ({ patient, onClose }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctor/appointments?patientId=${patient.patientId}`);
      const items = Array.isArray(response.data) ? response.data : (response.data.items ?? []);
      setAppointments(items);
    } catch (error) {
      console.error('Failed to fetch patient appointments', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveDateAndTime = (appointment: Appointment) => {
    if (appointment.date && appointment.time) {
      const dayLabel =
        appointment.day ||
        new Date(`${appointment.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
      return { dayLabel, timeLabel: appointment.time };
    }

    if (appointment.appointmentTime) {
      const parsed = new Date(appointment.appointmentTime);
      if (!Number.isNaN(parsed.getTime())) {
        return {
          dayLabel: parsed.toLocaleDateString('en-US', { weekday: 'long' }),
          timeLabel: parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        };
      }
      return { dayLabel: '-', timeLabel: appointment.appointmentTime };
    }

    return { dayLabel: '-', timeLabel: '-' };
  };

  useEffect(() => {
    fetchAppointments();
  }, [patient.patientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 font-['Outfit']">
      <div className="w-full max-w-[640px] bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-[#122c24] tracking-tight">Appointment History</h2>
            <p className="text-base font-semibold text-slate-500 mt-1">
              Manage slots for <span className="text-emerald-600 font-black">{patient.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Appointment History</h3>
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-full font-black text-sm border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
            >
              <span className="text-lg leading-none">+</span> Book New Slot
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Day</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-xs font-bold text-slate-400 italic">No upcoming appointments found</p>
                    </td>
                  </tr>
                ) : (
                  appointments
                    .sort((a, b) => {
                      const aRaw = a.date && a.time ? `${a.date}T${a.time}` : (a.appointmentTime ?? '');
                      const bRaw = b.date && b.time ? `${b.date}T${b.time}` : (b.appointmentTime ?? '');
                      const aTime = new Date(aRaw).getTime();
                      const bTime = new Date(bRaw).getTime();
                      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
                    })
                    .map((appt) => {
                      const { dayLabel, timeLabel } = resolveDateAndTime(appt);

                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#122c24]">{appt.patientName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">{appt.doctorName || 'Unassigned'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">{dayLabel}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600 uppercase">{timeLabel}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-emerald-100 text-[10px] font-black text-emerald-700 rounded-lg uppercase tracking-tight">
                              scheduled
                            </span>
                          </td>
                          <td className="px-8 py-4 whitespace-nowrap text-right">
                            <button className="text-sm font-black text-emerald-600 hover:text-emerald-700 transition-colors">
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showBookModal && (
          <BookAppointmentModal 
            isOpen={showBookModal}
            onClose={() => setShowBookModal(false)}
            onSuccess={() => {
              setShowBookModal(false);
              fetchAppointments();
            }}
            initialPatientId={patient.patientId}
          />
        )}
      </div>
    </div>
  );
};

export default PatientSlotsModal;
