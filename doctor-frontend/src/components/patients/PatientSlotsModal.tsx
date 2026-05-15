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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 font-['Outfit'] backdrop-blur-sm">
      <div className="w-full max-w-[860px] overflow-hidden rounded-[28px] bg-white shadow-2xl animate-in fade-in zoom-in duration-200 sm:rounded-[40px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-50 px-5 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#122c24] sm:text-3xl">Appointment History</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 sm:text-base">
              Manage slots for <span className="text-emerald-600 font-black">{patient.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100"
            type="button"
            title="Close"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-110px)] overflow-y-auto p-5 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Appointment History</h3>
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-5 py-2.5 text-sm font-black text-emerald-700 shadow-sm transition-all active:scale-95 hover:bg-emerald-100 sm:px-6"
              type="button"
            >
              <Plus className="w-4 h-4" /> Book New Slot
            </button>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white xl:block">
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
                            <button className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm" title="View History">
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

          <div className="space-y-3 xl:hidden">
            {loading ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
                <p className="text-sm font-bold italic text-slate-400">No upcoming appointments found</p>
              </div>
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
                    <article key={appt.id} className="rounded-[26px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black text-[#122c24]">{appt.patientName}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{appt.doctorName || 'Unassigned'}</p>
                        </div>
                        <span className="rounded-lg bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700">
                          scheduled
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-3xl bg-slate-50/70 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Day</p>
                          <p className="mt-1 text-sm font-bold text-[#122c24]">{dayLabel}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Time</p>
                          <p className="mt-1 text-sm font-bold uppercase text-[#122c24]">{timeLabel}</p>
                        </div>
                      </div>
                    </article>
                  );
                })
            )}
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
