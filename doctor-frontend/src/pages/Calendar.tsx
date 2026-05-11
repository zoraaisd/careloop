import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface CalendarData {
  doctors: Array<{ doctorId: string; doctorName: string; appointmentCount: number }>;
  summary: { today: number; waiting: number; engaged: number; done: number };
  availableSlots: Array<any>;
  bookedSlots: Array<{
    slotId: string;
    doctorId: string;
    date: string;
    time: string;
    patientName?: string;
    patientId?: string;
    appointmentId?: string;
    doctorName?: string;
    day?: string;
    status?: string;
    notes?: string | null;
  }>;
}

interface AppointmentListItem {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  date: string;
  day: string;
  time: string;
  status: string;
  notes: string | null;
}

type AppointmentListResponse = {
  total: number;
  items: AppointmentListItem[];
};

const formatStatus = (value?: string) => {
  if (!value) return 'Scheduled';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalizeDateKey = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
};

const toTimeInputValue = (value?: string) => {
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

const getUpcomingSoonState = (date?: string, time?: string) => {
  const normalizedDate = normalizeDateKey(date);
  const normalizedTime = toTimeInputValue(time);
  if (!normalizedDate || !normalizedTime) {
    return {
      isSoon: false,
      isVerySoon: false,
      isLive: false,
      isOverdue: false,
      isCheckInLate: false,
      isMissed: false,
    };
  }

  const appointmentAt = new Date(`${normalizedDate}T${normalizedTime}:00`);
  if (Number.isNaN(appointmentAt.getTime())) {
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

import BookAppointmentModal from '@/components/appointments/BookAppointmentModal';

const getCalendarRangeStart = (value: Date) => startOfWeek(value, { weekStartsOn: 1 });

const Calendar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentDate, setCurrentDate] = useState(() => getCalendarRangeStart(new Date()));
  
  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ date: '', time: '' });
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarData['bookedSlots'][number] | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<CalendarData['bookedSlots'][number] | null>(null);
  const [actionAppointmentId, setActionAppointmentId] = useState<string | null>(null);

  const startDate = currentDate;
  const weekDays = [...Array(6)].map((_, i) => addDays(startDate, i));
  const previousRangeStart = addDays(startDate, -6);
  const nextRangeStart = addDays(startDate, 6);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const dateFrom = format(weekDays[0], 'yyyy-MM-dd');
      const dateTo = format(weekDays[5], 'yyyy-MM-dd');
      const [calendarResponse, appointmentResponse] = await Promise.all([
        api.get(`/doctor/calendar?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        api.get<AppointmentListResponse | AppointmentListItem[]>('/doctor/appointments'),
      ]);

      const appointmentPayload = appointmentResponse.data;
      const appointmentItems = Array.isArray(appointmentPayload)
        ? appointmentPayload
        : appointmentPayload?.items ?? [];
      const visibleAppointments = appointmentItems.filter((appointment) => {
        const normalizedDate = normalizeDateKey(appointment.date);
        return normalizedDate >= dateFrom && normalizedDate <= dateTo;
      });

      const mergedData = {
        ...calendarResponse.data,
        bookedSlots: visibleAppointments.map((appointment) => ({
          slotId: `appointment-${appointment.appointmentId}`,
          doctorId: appointment.doctorId,
          date: normalizeDateKey(appointment.date),
          time: appointment.time,
          patientName: appointment.patientName,
          patientId: appointment.patientId,
          appointmentId: appointment.appointmentId,
          doctorName: appointment.doctorName,
          day: appointment.day,
          status: appointment.status,
          notes: appointment.notes,
        })),
      };

      setCalendarData(mergedData);
    } catch (error) {
      console.error('Failed to fetch calendar data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentDate]);

  const baseTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

  const toMinutes = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  const timeSlots = React.useMemo(() => {
    const dynamicSlots = [
      ...(calendarData?.bookedSlots.map((slot) => slot.time) ?? []),
      ...(calendarData?.availableSlots.map((slot) => slot.time) ?? []),
    ];

    return Array.from(new Set([...baseTimeSlots, ...dynamicSlots])).sort(
      (left, right) => toMinutes(left) - toMinutes(right),
    );
  }, [calendarData]);

  const getAppointmentsForSlot = (date: Date, time: string) => {
    if (!calendarData) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.bookedSlots.filter(
      (slot) => slot.date === dateStr && slot.time === time
    );
  };

  const handleSlotClick = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Convert 12h (01:00 PM) to 24h (13:00) for input type="time"
    let [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr);
    const isPM = time.includes('PM');
    
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    const time24 = `${hour.toString().padStart(2, '0')}:${minuteStr.split(' ')[0]}`;
    
    setSelectedSlot({ 
      date: dateStr, 
      time: time24
    });
    setShowBookModal(true);
  };

  const handleAppointmentClick = (appointment: CalendarData['bookedSlots'][number]) => {
    setSelectedAppointment(appointment);
  };

  const openReschedule = (appointment: CalendarData['bookedSlots'][number]) => {
    setSelectedAppointment(null);
    setEditingAppointment(appointment);
    setShowBookModal(true);
  };

  const handleQuickStatusUpdate = async (appointment: CalendarData['bookedSlots'][number], status: string) => {
    if (!appointment.appointmentId || !appointment.patientId) {
      return;
    }

    setActionAppointmentId(appointment.appointmentId);
    try {
      await api.patch(`/doctor/appointments/${appointment.appointmentId}`, {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
        day: appointment.day,
        notes: appointment.notes ?? undefined,
        status,
      });
      await fetchCalendar();
      setSelectedAppointment((current) =>
        current && current.appointmentId === appointment.appointmentId
          ? { ...current, status }
          : current,
      );
    } catch (error) {
      console.error('Failed to update appointment status', error);
    } finally {
      setActionAppointmentId(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden bg-[#f8fafc]">
      {/* Modals */}
      <BookAppointmentModal 
        isOpen={showBookModal}
        onClose={() => {
          setShowBookModal(false);
          setEditingAppointment(null);
        }}
        onSuccess={fetchCalendar}
        appointmentId={editingAppointment?.appointmentId}
        initialPatientId={editingAppointment?.patientId ?? ''}
        initialDoctorId={editingAppointment?.doctorId ?? ''}
        initialDate={editingAppointment?.date ?? selectedSlot.date}
        initialTime={editingAppointment ? toTimeInputValue(editingAppointment.time) : selectedSlot.time}
        initialNotes={editingAppointment?.notes ?? ''}
        initialStatus={editingAppointment?.status ?? 'scheduled'}
      />
      {selectedAppointment && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="relative w-full max-w-md rounded-[32px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            {(() => {
              const appointmentState = getUpcomingSoonState(selectedAppointment.date, selectedAppointment.time);
              const isScheduled = (selectedAppointment.status ?? '').toLowerCase() === 'scheduled';
              return (
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-emerald-600 uppercase">Appointment Details</p>
                <h3 className="mt-1 text-2xl font-black text-[#1e293b]">
                  {selectedAppointment.patientName || 'Patient'}
                </h3>
                {(appointmentState.isSoon || appointmentState.isLive || appointmentState.isOverdue) && (
                  <span
                    className={
                      isScheduled && appointmentState.isMissed
                        ? 'mt-3 inline-flex rounded-full bg-rose-200 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-rose-800'
                        : isScheduled && appointmentState.isCheckInLate
                          ? 'mt-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-700'
                        : appointmentState.isOverdue
                        ? 'mt-3 inline-flex rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700'
                        : appointmentState.isLive
                          ? 'mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800'
                          : appointmentState.isVerySoon
                            ? 'mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700'
                            : 'mt-3 inline-flex rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-sky-700'
                    }
                  >
                    {isScheduled && appointmentState.isMissed
                      ? 'Missed Appointment'
                      : isScheduled && appointmentState.isCheckInLate
                        ? 'Patient Not Checked In'
                        : appointmentState.isOverdue ? 'Overdue' : appointmentState.isLive ? 'Now Live' : 'Starting Soon'}
                  </span>
                )}
              </div>
              <button
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedAppointment(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
              );
            })()}
            <div className="space-y-4 px-6 py-5">
              {selectedAppointment.appointmentId && (
                <div className="flex flex-wrap gap-3">
                  {((selectedAppointment.status ?? '').toLowerCase() === 'scheduled') && (
                    <button
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50"
                      disabled={actionAppointmentId === selectedAppointment.appointmentId}
                      onClick={() => handleQuickStatusUpdate(selectedAppointment, 'waiting')}
                      type="button"
                    >
                      Check In
                    </button>
                  )}
                  <button
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                    onClick={() => openReschedule(selectedAppointment)}
                    type="button"
                  >
                    Reschedule
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Doctor</p>
                  <p className="mt-1 text-sm font-black text-[#1e293b]">{selectedAppointment.doctorName || 'Not available'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-black text-emerald-600">{formatStatus(selectedAppointment.status)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                  <p className="mt-1 text-sm font-black text-[#1e293b]">
                    {selectedAppointment.date ? format(parseISO(selectedAppointment.date), 'dd MMM yyyy') : 'Not available'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Time</p>
                  <p className="mt-1 text-sm font-black text-[#1e293b]">{selectedAppointment.time || 'Not available'}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {selectedAppointment.notes?.trim() || 'No notes added for this appointment.'}
                </p>
              </div>
              {((selectedAppointment.status ?? '').toLowerCase() === 'scheduled') && getUpcomingSoonState(selectedAppointment.date, selectedAppointment.time).isCheckInLate && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                  Patient not checked in yet for this scheduled appointment.
                </div>
              )}
              {((selectedAppointment.status ?? '').toLowerCase() === 'scheduled') && getUpcomingSoonState(selectedAppointment.date, selectedAppointment.time).isMissed && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                  This scheduled appointment appears missed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 shrink-0 px-1">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b]">Medical Calendar</h2>
          <p className="text-sm text-slate-500 font-medium">Manage your schedule and patient visits</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setCurrentDate(previousRangeStart)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <CalendarIcon className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-[#1e293b] min-w-[180px] text-center">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[5], 'MMM d, yyyy')}
            </span>
          </div>
          <button 
            onClick={() => setCurrentDate(nextRangeStart)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => setCurrentDate(getCalendarRangeStart(new Date()))}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors text-sm"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Stats Sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-5 overflow-y-auto pr-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</span>
              <div className="text-2xl font-black text-[#1e293b] mt-1">{calendarData?.summary.today || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting</span>
              <div className="text-2xl font-black text-amber-500 mt-1">{calendarData?.summary.waiting || 0}</div>
            </div>
          </div>

          {/* Doctors List */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-5">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Clinic Doctors
            </h3>
            <div className="space-y-2">
              {calendarData?.doctors.map((doc) => (
                <div key={doc.doctorId} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                      {doc.doctorName.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-[#334155]">{doc.doctorName}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    {doc.appointmentCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Schedule List */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-5 flex flex-col min-h-0">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              Today's Schedule
            </h3>
            <div className="space-y-3 overflow-y-auto pr-1">
              {calendarData?.bookedSlots.filter(slot => isSameDay(parseISO(slot.date), new Date())).length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No visits today</p>
                </div>
              ) : (
                calendarData?.bookedSlots
                  .filter(slot => isSameDay(parseISO(slot.date), new Date()))
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((apt) => {
                    const soonState = getUpcomingSoonState(apt.date, apt.time);
                    const isScheduled = (apt.status ?? '').toLowerCase() === 'scheduled';

                    return (
                    <div
                      key={apt.appointmentId ?? apt.slotId}
                      className={
                        isScheduled && soonState.isMissed
                          ? 'bg-rose-100 p-3 rounded-2xl border border-rose-300 hover:bg-rose-200/60 transition-all cursor-pointer group'
                          : isScheduled && soonState.isCheckInLate
                            ? 'bg-red-50 p-3 rounded-2xl border border-red-200 hover:bg-red-100/60 transition-all cursor-pointer group'
                          : soonState.isOverdue
                          ? 'bg-rose-50 p-3 rounded-2xl border border-rose-200 hover:bg-rose-100/60 transition-all cursor-pointer group'
                          : soonState.isLive
                            ? 'bg-emerald-100 p-3 rounded-2xl border border-emerald-300 hover:bg-emerald-200/60 transition-all cursor-pointer group'
                          : soonState.isVerySoon
                          ? 'bg-amber-50 p-3 rounded-2xl border border-amber-200 hover:bg-amber-100/60 transition-all cursor-pointer group'
                          : soonState.isSoon
                            ? 'bg-sky-50 p-3 rounded-2xl border border-sky-200 hover:bg-sky-100/60 transition-all cursor-pointer group'
                            : 'bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group'
                      }
                      onClick={() => handleAppointmentClick(apt)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-600">{apt.time}</span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      </div>
                      <p className="text-[13px] font-black text-[#1e293b] leading-tight truncate">{apt.patientName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Confirmed Patient</p>
                        {((isScheduled && (soonState.isCheckInLate || soonState.isMissed)) || soonState.isSoon || soonState.isLive || soonState.isOverdue) && (
                          <span
                            className={
                              isScheduled && soonState.isMissed
                                ? 'inline-flex rounded-full bg-rose-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-800'
                                : isScheduled && soonState.isCheckInLate
                                  ? 'inline-flex rounded-full bg-red-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-red-700'
                                : soonState.isOverdue
                                ? 'inline-flex rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-700'
                                : soonState.isLive
                                  ? 'inline-flex rounded-full bg-emerald-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-800'
                              : soonState.isVerySoon
                                ? 'inline-flex rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-700'
                                : 'inline-flex rounded-full bg-sky-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-sky-700'
                            }
                          >
                            {isScheduled && soonState.isMissed
                              ? 'Missed'
                              : isScheduled && soonState.isCheckInLate
                                ? 'Not Checked In'
                                : soonState.isOverdue ? 'Overdue' : soonState.isLive ? 'Now Live' : 'Starting Soon'}
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar Grid */}
        <div className="flex-1 bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col min-h-0 overflow-hidden">
          {/* Grid Header */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="w-24 shrink-0 border-r border-slate-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            {weekDays.map((day, idx) => (
              <div key={idx} className={`flex-1 border-r border-slate-100 last:border-r-0 py-4 flex flex-col items-center justify-center ${isSameDay(day, new Date()) ? 'bg-emerald-50/50' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEE')}</span>
                <span className={`text-lg font-black mt-0.5 ${isSameDay(day, new Date()) ? 'text-emerald-600' : 'text-[#1e293b]'}`}>
                  {format(day, 'd')}
                </span>
                {isSameDay(day, new Date()) && <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1"></div>}
              </div>
            ))}
          </div>
          
          {/* Grid Body */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-slate-400">Syncing Schedule...</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                {timeSlots.map((time, timeIdx) => (
                  <div key={timeIdx} className="flex border-b border-slate-50 min-h-[100px]">
                    <div className="w-24 shrink-0 border-r border-slate-100 py-4 px-2 flex items-start justify-center">
                      <span className="text-[11px] font-black text-slate-400">{time}</span>
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const appointments = getAppointmentsForSlot(day, time);
                      return (
                        <div key={dayIdx} className="flex-1 border-r border-slate-50 last:border-r-0 relative group p-1.5">
                          {appointments.length > 0 ? (
                            appointments.map((apt) => {
                              const soonState = getUpcomingSoonState(apt.date, apt.time);
                              const isScheduled = (apt.status ?? '').toLowerCase() === 'scheduled';

                              return (
                              <div 
                                key={apt.appointmentId ?? apt.slotId}
                                className={
                                  isScheduled && soonState.isMissed
                                    ? 'h-full w-full bg-rose-100 border-l-4 border-rose-600 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : isScheduled && soonState.isCheckInLate
                                      ? 'h-full w-full bg-red-50 border-l-4 border-red-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isOverdue
                                    ? 'h-full w-full bg-rose-50 border-l-4 border-rose-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isLive
                                      ? 'h-full w-full bg-emerald-100 border-l-4 border-emerald-600 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                  : soonState.isVerySoon
                                    ? 'h-full w-full bg-amber-50 border-l-4 border-amber-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isSoon
                                      ? 'h-full w-full bg-sky-50 border-l-4 border-sky-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                      : 'h-full w-full bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                }
                                onClick={() => handleAppointmentClick(apt)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={
                                        isScheduled && soonState.isMissed
                                          ? 'text-[10px] font-bold uppercase tracking-wider text-rose-800'
                                          : isScheduled && soonState.isCheckInLate
                                            ? 'text-[10px] font-bold uppercase tracking-wider text-red-700'
                                          : soonState.isOverdue
                                          ? 'text-[10px] font-bold uppercase tracking-wider text-rose-700'
                                          : soonState.isLive
                                            ? 'text-[10px] font-bold uppercase tracking-wider text-emerald-800'
                                        : soonState.isVerySoon
                                          ? 'text-[10px] font-bold uppercase tracking-wider text-amber-700'
                                          : soonState.isSoon
                                            ? 'text-[10px] font-bold uppercase tracking-wider text-sky-700'
                                            : 'text-[10px] font-bold uppercase tracking-wider text-emerald-600'
                                      }
                                    >
                                      Booked
                                    </span>
                                    {((isScheduled && (soonState.isCheckInLate || soonState.isMissed)) || soonState.isSoon || soonState.isLive || soonState.isOverdue) && (
                                      <span
                                        className={
                                          isScheduled && soonState.isMissed
                                            ? 'inline-flex rounded-full bg-rose-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-800'
                                            : isScheduled && soonState.isCheckInLate
                                              ? 'inline-flex rounded-full bg-red-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-red-700'
                                            : soonState.isOverdue
                                            ? 'inline-flex rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-700'
                                            : soonState.isLive
                                              ? 'inline-flex rounded-full bg-emerald-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-800'
                                          : soonState.isVerySoon
                                            ? 'inline-flex rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-700'
                                            : 'inline-flex rounded-full bg-sky-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-sky-700'
                                        }
                                      >
                                        {isScheduled && soonState.isMissed
                                          ? 'Missed'
                                          : isScheduled && soonState.isCheckInLate
                                            ? 'Not Checked In'
                                            : soonState.isOverdue ? 'Overdue' : soonState.isLive ? 'Now Live' : 'Starting Soon'}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={
                                      isScheduled && soonState.isMissed
                                        ? 'h-6 w-6 rounded-lg bg-rose-200 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : isScheduled && soonState.isCheckInLate
                                          ? 'h-6 w-6 rounded-lg bg-red-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isOverdue
                                        ? 'h-6 w-6 rounded-lg bg-rose-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isLive
                                          ? 'h-6 w-6 rounded-lg bg-emerald-200 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                      : soonState.isVerySoon
                                        ? 'h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isSoon
                                          ? 'h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                          : 'h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                    }
                                  >
                                    <Plus
                                      className={
                                        isScheduled && soonState.isMissed
                                          ? 'h-3.5 w-3.5 text-rose-700'
                                          : isScheduled && soonState.isCheckInLate
                                            ? 'h-3.5 w-3.5 text-red-600'
                                          : soonState.isOverdue
                                          ? 'h-3.5 w-3.5 text-rose-600'
                                          : soonState.isLive
                                            ? 'h-3.5 w-3.5 text-emerald-700'
                                        : soonState.isVerySoon
                                          ? 'h-3.5 w-3.5 text-amber-600'
                                          : soonState.isSoon
                                            ? 'h-3.5 w-3.5 text-sky-600'
                                            : 'h-3.5 w-3.5 text-emerald-600'
                                      }
                                    />
                                  </div>
                                </div>
                                <p className="text-sm font-black text-[#1e293b] mt-1 truncate">{apt.patientName}</p>
                                <div
                                  className={
                                    isScheduled && soonState.isMissed
                                      ? 'flex items-center gap-1.5 mt-1 text-rose-800/80'
                                      : isScheduled && soonState.isCheckInLate
                                        ? 'flex items-center gap-1.5 mt-1 text-red-700/80'
                                      : soonState.isOverdue
                                      ? 'flex items-center gap-1.5 mt-1 text-rose-700/80'
                                      : soonState.isLive
                                        ? 'flex items-center gap-1.5 mt-1 text-emerald-800/80'
                                    : soonState.isVerySoon
                                      ? 'flex items-center gap-1.5 mt-1 text-amber-700/80'
                                      : soonState.isSoon
                                        ? 'flex items-center gap-1.5 mt-1 text-sky-700/80'
                                        : 'flex items-center gap-1.5 mt-1 text-emerald-700/70'
                                  }
                                >
                                  <User className="h-3 w-3" />
                                  <span className="text-[11px] font-bold">Patient Visit</span>
                                </div>
                              </div>
                              );
                            })
                          ) : (
                            <button 
                              onClick={() => handleSlotClick(day, time)}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-emerald-50/30"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="h-10 w-10 rounded-2xl bg-white shadow-xl flex items-center justify-center text-emerald-600 border border-emerald-100 hover:scale-110 transition-transform">
                                  <Plus className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Book Slot</span>
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
