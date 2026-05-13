import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { X, Plus, Calendar, User, History } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 font-['Outfit'] animate-in fade-in duration-300">
      <div className="w-full max-w-[720px] bg-white rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-white/20">
        {/* Header */}
        <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-[#122c24] tracking-tight">Timeline</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              Appointment history for <span className="text-emerald-600">{patient.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all hover:rotate-90 text-slate-400"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center justify-between mb-8 px-2">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Visits</h3>
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-3 px-8 py-3.5 bg-[#122c24] text-white rounded-full font-black text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Book New Slot
            </button>
          </div>

          <div className="bg-slate-50/50 rounded-[40px] border border-slate-50 overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Physician</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/30 bg-transparent">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Syncing timeline...</p>
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="max-w-[200px] mx-auto opacity-30">
                        <Calendar className="w-10 h-10 mx-auto mb-4 text-slate-300" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No appointment records found</p>
                      </div>
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
                        <tr key={appt.id} className="hover:bg-white transition-colors group">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                                <User className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-black text-[#122c24]">{appt.doctorName || 'Unassigned Doctor'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <p className="text-sm font-black text-[#122c24] leading-none mb-1">{dayLabel}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timeLabel}</p>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-center">
                            <span className="px-3 py-1 bg-emerald-50 text-[10px] font-black text-emerald-600 rounded-lg uppercase tracking-tight border border-emerald-100">
                              Confirmed
                            </span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-right">
                            <button className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                              <History className="w-5 h-5" />
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
