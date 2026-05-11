import React, { useEffect, useState } from 'react';
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

import BookAppointmentModal from '@/components/appointments/BookAppointmentModal';

const toDateInputValue = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value: string): string => {
  if (!value) return '';
  if (/^\d{2}:\d{2}$/.test(value)) return value;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';

  const [, rawHour, minutes, period] = match;
  let hour = Number(rawHour);

  if (period.toUpperCase() === 'AM') {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return `${String(hour).padStart(2, '0')}:${minutes}`;
};

const parseAppointmentDateTime = (date: string, time: string): Date | null => {
  const normalizedDate = toDateInputValue(date);
  const normalizedTime = toTimeInputValue(time);
  if (!normalizedDate || !normalizedTime) return null;

  const parsed = new Date(`${normalizedDate}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCountdown = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

const getUpcomingSoonState = (date: string, time: string) => {
  const appointmentAt = parseAppointmentDateTime(date, time);
  if (!appointmentAt) {
    return {
      isSoon: false,
      isVerySoon: false,
      isLive: false,
      isOverdue: false,
      isCheckInLate: false,
      isMissed: false,
    };
  }

  const now = new Date();
  const diffMinutes = (appointmentAt.getTime() - now.getTime()) / (1000 * 60);
  const isToday = appointmentAt.toDateString() === now.toDateString();

  return {
    isSoon: isToday && diffMinutes > 0 && diffMinutes <= 30,
    isVerySoon: isToday && diffMinutes > 0 && diffMinutes <= 15,
    isLive: isToday && diffMinutes <= 0 && diffMinutes >= -10,
    isOverdue: isToday && diffMinutes < -10,
    isCheckInLate: isToday && diffMinutes < 0 && diffMinutes >= -15,
    isMissed: isToday && diffMinutes < -15,
  };
};

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [actionAppointmentId, setActionAppointmentId] = useState<string | null>(null);

  const closeModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
  };

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

  useEffect(() => {
    void fetchAppointments();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const todaysAppointments = appointments
    .map((appointment) => ({
      ...appointment,
      appointmentAt: parseAppointmentDateTime(appointment.date, appointment.time),
    }))
    .filter((appointment) => appointment.appointmentAt && appointment.appointmentAt.toDateString() === now.toDateString())
    .sort((left, right) => left.appointmentAt!.getTime() - right.appointmentAt!.getTime());

  const nextAppointment = todaysAppointments.find((appointment) => appointment.appointmentAt!.getTime() >= now.getTime()) ?? null;
  const nextAppointmentMinutes =
    nextAppointment ? Math.max(0, Math.ceil((nextAppointment.appointmentAt!.getTime() - now.getTime()) / (1000 * 60))) : null;
  const delayedScheduledAppointments = todaysAppointments.filter((appointment) => {
    if ((appointment.status ?? '').toLowerCase() !== 'scheduled') {
      return false;
    }

    const state = getUpcomingSoonState(appointment.date, appointment.time);
    return state.isCheckInLate || state.isMissed;
  });

  const openReschedule = (appointment: AppointmentRow) => {
    setEditingAppointment(appointment);
    setShowModal(true);
  };

  const handleQuickStatusUpdate = async (appointment: AppointmentRow, status: string) => {
    setActionAppointmentId(appointment.appointmentId);
    try {
      await api.patch(`/doctor/appointments/${appointment.appointmentId}`, {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: toDateInputValue(appointment.date),
        time: appointment.time,
        day: appointment.day,
        notes: appointment.notes ?? undefined,
        status,
      });
      await fetchAppointments();
    } catch (error) {
      console.error('Failed to update appointment status', error);
    } finally {
      setActionAppointmentId(null);
    }
  };

  return (
    <div className="space-y-4">
      <BookAppointmentModal 
        isOpen={showModal}
        onClose={closeModal}
        onSuccess={fetchAppointments}
        appointmentId={editingAppointment?.appointmentId}
        initialPatientId={editingAppointment?.patientId ?? ''}
        initialDoctorId={editingAppointment?.doctorId ?? ''}
        initialDate={toDateInputValue(editingAppointment?.date ?? '')}
        initialTime={toTimeInputValue(editingAppointment?.time ?? '')}
        initialNotes={editingAppointment?.notes ?? ''}
        initialStatus={editingAppointment?.status ?? 'scheduled'}
      />

      <div>
        <button
          className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
          onClick={() => {
            setEditingAppointment(null);
            setShowModal(true);
          }}
          type="button"
        >
          + New Appointment
        </button>
      </div>

      <div className="rounded-2xl border border-[#bfd0c8] bg-gradient-to-r from-[#eefbf4] via-white to-[#f6fbff] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1faa62]">Today's Appointments</p>
            <h3 className="mt-1 text-2xl font-black text-[#17352d]">{todaysAppointments.length} scheduled today</h3>
            <p className="mt-1 text-sm font-medium text-[#5f776e]">
              {nextAppointment && nextAppointmentMinutes !== null
                ? `Next appointment in ${formatCountdown(nextAppointmentMinutes)}`
                : todaysAppointments.length > 0
                  ? 'All remaining appointments for today are completed or overdue.'
                  : 'No appointments scheduled for today yet.'}
            </p>
            {delayedScheduledAppointments.length > 0 && (
              <p className="mt-2 text-sm font-bold text-rose-600">
                {delayedScheduledAppointments[0]
                  ? `${delayedScheduledAppointments[0].patientName} has not checked in yet.`
                  : 'Patient not checked in yet.'}
              </p>
            )}
          </div>

          {nextAppointment && nextAppointmentMinutes !== null && (
            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-[#d8e8df]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6c847a]">Next Up</p>
              <p className="mt-1 text-lg font-black text-[#17352d]">{nextAppointment.patientName}</p>
              <p className="text-sm font-semibold text-[#4f6b61]">
                {nextAppointment.time} with {nextAppointment.doctorName}
              </p>
            </div>
          )}
        </div>

        {todaysAppointments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {todaysAppointments.slice(0, 6).map((appointment) => (
              <span
                className="inline-flex rounded-full border border-[#d6e6dd] bg-white px-3 py-1.5 text-xs font-bold text-[#365247]"
                key={appointment.appointmentId}
              >
                {appointment.time} • {appointment.patientName}
              </span>
            ))}
          </div>
        )}

        {delayedScheduledAppointments.length > 0 && (
          <div className="mt-4 space-y-2">
            {delayedScheduledAppointments.slice(0, 3).map((appointment) => {
              const state = getUpcomingSoonState(appointment.date, appointment.time);
              return (
                <div
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                  key={`delayed-${appointment.appointmentId}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <span>
                      {state.isMissed
                        ? `${appointment.patientName} missed the ${appointment.time} appointment.`
                        : `${appointment.patientName} not checked in yet for the ${appointment.time} appointment.`}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#1faa62] ring-1 ring-[#b9dcc9]"
                        onClick={() => handleQuickStatusUpdate(appointment, 'waiting')}
                        type="button"
                      >
                        Check In
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-rose-700 ring-1 ring-rose-200"
                        onClick={() => openReschedule(appointment)}
                        type="button"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              appointments.map((appointment) => {
                const soonState = getUpcomingSoonState(appointment.date, appointment.time);
                const isScheduled = (appointment.status ?? '').toLowerCase() === 'scheduled';
                const isActionLoading = actionAppointmentId === appointment.appointmentId;

                return (
                <tr
                  className={
                    (isScheduled && soonState.isMissed)
                      ? 'bg-rose-100 hover:bg-rose-200/70'
                      : (isScheduled && soonState.isCheckInLate)
                        ? 'bg-red-50 hover:bg-red-100/70'
                      : soonState.isOverdue
                      ? 'bg-rose-50 hover:bg-rose-100/70'
                      : soonState.isLive
                        ? 'bg-emerald-100 hover:bg-emerald-200/70'
                        : soonState.isVerySoon
                      ? 'bg-amber-50 hover:bg-amber-100/70'
                      : soonState.isSoon
                        ? 'bg-sky-50 hover:bg-sky-100/70'
                        : 'hover:bg-[#f8fbf9]'
                  }
                  key={appointment.appointmentId}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d] font-bold">{appointment.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.doctorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.day || appointment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">
                    <div className="flex items-center gap-2">
                      <span>{appointment.time}</span>
                      {((isScheduled) && (soonState.isCheckInLate || soonState.isMissed))
                        || soonState.isSoon || soonState.isLive || soonState.isOverdue ? (
                        <span
                          className={
                            (isScheduled && soonState.isMissed)
                              ? 'inline-flex rounded-full bg-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-800'
                              : (isScheduled && soonState.isCheckInLate)
                                ? 'inline-flex rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700'
                            : soonState.isOverdue
                              ? 'inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700'
                              : soonState.isLive
                                ? 'inline-flex rounded-full bg-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800'
                              : soonState.isVerySoon
                              ? 'inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700'
                              : 'inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-sky-700'
                          }
                        >
                          {(isScheduled && soonState.isMissed)
                            ? 'Missed'
                            : (isScheduled && soonState.isCheckInLate)
                              ? 'Not Checked In'
                            : soonState.isOverdue ? 'Overdue' : soonState.isLive ? 'Now Live' : 'Starting Soon'}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded bg-emerald-100 text-emerald-800">
                      {appointment.status || 'Scheduled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="text-emerald-600 hover:text-emerald-900 font-bold"
                        onClick={() => openReschedule(appointment)}
                        type="button"
                      >
                        Edit
                      </button>
                      {isScheduled && (
                        <button
                          className="text-sky-600 hover:text-sky-800 font-bold disabled:opacity-50"
                          disabled={isActionLoading}
                          onClick={() => handleQuickStatusUpdate(appointment, 'waiting')}
                          type="button"
                        >
                          Check In
                        </button>
                      )}
                      {isScheduled && (soonState.isCheckInLate || soonState.isMissed) && (
                        <button
                          className="text-rose-600 hover:text-rose-800 font-bold"
                          onClick={() => openReschedule(appointment)}
                          type="button"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Appointments;
