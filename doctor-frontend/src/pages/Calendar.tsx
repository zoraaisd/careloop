import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getClinicDoctorDetails, type ClinicDoctorDetails } from '@/services/doctor-management';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentDate, setCurrentDate] = useState(() => getCalendarRangeStart(new Date()));
  
  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ date: '', time: '' });
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarData['bookedSlots'][number] | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<CalendarData['bookedSlots'][number] | null>(null);
  const [actionAppointmentId, setActionAppointmentId] = useState<string | null>(null);
  const [selectedCalendarDoctor, setSelectedCalendarDoctor] = useState<ClinicDoctorDetails | null>(null);
  const [isDoctorDetailsLoading, setIsDoctorDetailsLoading] = useState(false);

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
      emitDashboardRefresh('calendar:status');
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

  const handleOpenDoctorDetails = async (doctorId: string) => {
    setIsDoctorDetailsLoading(true);

    try {
      const details = await getClinicDoctorDetails(doctorId);
      setSelectedCalendarDoctor(details);
    } catch (error) {
      console.error('Failed to load doctor details', error);
      setSelectedCalendarDoctor(null);
    } finally {
      setIsDoctorDetailsLoading(false);
    }
  };

  const todaysBookedSlots =
    calendarData?.bookedSlots
      .filter((slot) => isSameDay(parseISO(slot.date), new Date()))
      .sort((a, b) => a.time.localeCompare(b.time)) ?? [];
  const summaryCards = [
    {
      label: 'Today',
      value: calendarData?.summary.today || 0,
      helper: 'Appointments',
      icon: CalendarIcon,
      iconClassName: 'text-emerald-600',
      iconWrapClassName: 'bg-emerald-50 ring-emerald-100',
      cardClassName: 'from-[#f2fffa] to-[#f8fffd]',
    },
    {
      label: 'Waiting',
      value: calendarData?.summary.waiting || 0,
      helper: 'Patients',
      icon: Clock,
      iconClassName: 'text-amber-500',
      iconWrapClassName: 'bg-amber-50 ring-amber-100',
      cardClassName: 'from-[#fffaf0] to-[#fffdf8]',
    },
  ];

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-[#dbe7e1] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-4 lg:h-[calc(100vh-104px)] lg:rounded-[32px] lg:p-5">
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
          <div className="relative w-full max-w-md rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
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
            <div className="space-y-3 px-5 py-4">
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
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Doctor</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">{selectedAppointment.doctorName || 'Not available'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-1 text-xs font-black text-emerald-600">{formatStatus(selectedAppointment.status)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">
                    {selectedAppointment.date ? format(parseISO(selectedAppointment.date), 'dd MMM yyyy') : 'Not available'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Time</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">{selectedAppointment.time || 'Not available'}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {selectedAppointment.notes?.trim() || 'No notes added for this appointment.'}
                </p>
              </div>
              {((selectedAppointment.status ?? '').toLowerCase() === 'scheduled') && getUpcomingSoonState(selectedAppointment.date, selectedAppointment.time).isCheckInLate && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">
                  Patient not checked in yet for this scheduled appointment.
                </div>
              )}
              {((selectedAppointment.status ?? '').toLowerCase() === 'scheduled') && getUpcomingSoonState(selectedAppointment.date, selectedAppointment.time).isMissed && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  This scheduled appointment appears missed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCalendarDoctor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedCalendarDoctor(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Doctor Details</p>
                <h3 className="mt-1 text-2xl font-black text-[#1e293b]">{selectedCalendarDoctor.name}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {selectedCalendarDoctor.specialty || 'General Physician'}
                </p>
              </div>
              <button
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedCalendarDoctor(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                  <p className="mt-1 text-xs font-black break-all text-[#1e293b]">{selectedCalendarDoctor.email}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Mobile</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">{selectedCalendarDoctor.mobile}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Patients</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">{selectedCalendarDoctor.patientCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Experience</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">
                    {selectedCalendarDoctor.experience !== null ? `${selectedCalendarDoctor.experience} years` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Qualification</p>
                  <p className="mt-1 text-xs font-black text-[#1e293b]">
                    {selectedCalendarDoctor.qualification || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-1 text-xs font-black capitalize text-emerald-600">{selectedCalendarDoctor.status}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Availability</p>
                <p className="mt-1 text-xs font-semibold text-[#334155]">
                  {selectedCalendarDoctor.availableDays.length > 0
                    ? selectedCalendarDoctor.availableDays.join(', ')
                    : 'Not added'}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#334155]">
                  {selectedCalendarDoctor.availableTimeSlots.length > 0
                    ? selectedCalendarDoctor.availableTimeSlots.join(', ')
                    : 'Time slots not added'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">About</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                  {selectedCalendarDoctor.aboutDoctor || 'No doctor bio added.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-slate-100 px-1 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[26px] font-black tracking-[-0.03em] text-[#173229]">Medical Calendar</h2>
          <p className="mt-0.5 text-[13px] font-medium text-slate-500">Manage your schedule and patient visits</p>
        </div>
        
        <div className="flex w-full flex-wrap items-center gap-2 self-start rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-sm lg:w-auto">
          <button 
            onClick={() => setCurrentDate(previousRangeStart)}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-2.5 sm:flex-initial">
            <CalendarIcon className="h-4 w-4 text-emerald-600" />
            <span className="min-w-0 flex-1 text-center text-sm font-black text-[#1e293b] sm:min-w-[210px]">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[5], 'MMM d, yyyy')}
            </span>
          </div>
          <button 
            onClick={() => setCurrentDate(nextRangeStart)}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-slate-200"></div>
          <button 
            onClick={() => setCurrentDate(getCalendarRangeStart(new Date()))}
            className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden xl:flex-row">
        {/* Left Stats Sidebar */}
        <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto xl:w-[264px] xl:pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className={`rounded-[20px] border border-slate-200 bg-gradient-to-br ${card.cardClassName} p-2.5 shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500">{card.label}</p>
                      <p className="mt-1.5 text-[20px] font-black leading-none text-[#172033]">{card.value}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{card.helper}</p>
                    </div>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-xl ring-1 ${card.iconWrapClassName}`}>
                      <Icon className={`h-3.5 w-3.5 ${card.iconClassName}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Doctors List */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black text-[#172033]">
                <div className="h-5 w-1 rounded-full bg-emerald-500"></div>
                Doctors
              </h3>
              <button
                className="cursor-pointer text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700"
                onClick={() => navigate('/clinic')}
                type="button"
              >
                View all
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              {calendarData?.doctors.map((doc) => (
                <button
                  key={doc.doctorId}
                  className={`group flex w-full items-center justify-between rounded-[20px] border bg-white p-2.5 text-left transition-colors ${
                    selectedCalendarDoctor?.userId === doc.doctorId
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-100 hover:border-emerald-100 hover:bg-slate-50'
                  }`}
                  onClick={() => void handleOpenDoctorDetails(doc.doctorId)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">
                      {doc.doctorName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold leading-tight text-[#334155]">{doc.doctorName}</p>
                      <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">General Physician</p>
                    </div>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                    {doc.appointmentCount}
                  </span>
                </button>
              ))}
            </div>

            {isDoctorDetailsLoading ? (
              <div className="mt-3 rounded-[20px] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Loading doctor details...</p>
              </div>
            ) : null}
          </div>

          {/* Today's Schedule List */}
          <div className="flex min-h-[200px] flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black text-[#172033]">
                <div className="h-5 w-1 rounded-full bg-emerald-500"></div>
                Today's Schedule
              </h3>
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="space-y-2.5 overflow-y-auto pr-1">
              {todaysBookedSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No visits today</p>
                </div>
              ) : (
                todaysBookedSlots.map((apt) => {
                  const soonState = getUpcomingSoonState(apt.date, apt.time);
                  const isScheduled = (apt.status ?? '').toLowerCase() === 'scheduled';

                  return (
                    <div
                      key={apt.appointmentId ?? apt.slotId}
                      className={
                        isScheduled && soonState.isMissed
                          ? 'group cursor-pointer rounded-[20px] border border-rose-300 bg-rose-100 px-2.5 py-2 hover:bg-rose-200/60 transition-all'
                          : isScheduled && soonState.isCheckInLate
                            ? 'group cursor-pointer rounded-[20px] border border-red-200 bg-red-50 px-2.5 py-2 hover:bg-red-100/60 transition-all'
                            : soonState.isOverdue
                            ? 'group cursor-pointer rounded-[20px] border border-rose-200 bg-rose-50 px-2.5 py-2 hover:bg-rose-100/60 transition-all'
                            : soonState.isLive
                              ? 'group cursor-pointer rounded-[20px] border border-emerald-300 bg-emerald-100 px-2.5 py-2 hover:bg-emerald-200/60 transition-all'
                              : soonState.isVerySoon
                                ? 'group cursor-pointer rounded-[20px] border border-amber-200 bg-amber-50 px-2.5 py-2 hover:bg-amber-100/60 transition-all'
                                : soonState.isSoon
                                  ? 'group cursor-pointer rounded-[20px] border border-sky-200 bg-sky-50 px-2.5 py-2 hover:bg-sky-100/60 transition-all'
                                  : 'group cursor-pointer rounded-[20px] border border-slate-100 bg-white px-2.5 py-2 transition-all hover:border-emerald-200 hover:bg-emerald-50/30'
                      }
                      onClick={() => handleAppointmentClick(apt)}
                    >
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[11px] font-black text-emerald-600">{apt.time}</span>
                      </div>
                      <p className="text-[13px] leading-tight font-bold text-[#334155]">{apt.patientName}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <p className="text-[11px] font-medium leading-tight text-slate-400">Confirmed Patient</p>
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
                                : soonState.isOverdue
                                  ? 'Overdue'
                                  : soonState.isLive
                                    ? 'Now Live'
                                    : 'Starting Soon'}
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:rounded-[34px]">
          <div className="min-h-0 flex-1 overflow-x-auto">
            <div className="flex min-h-full min-w-[820px] flex-col">
          {/* Grid Header */}
          <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/70">
            <div className="flex w-24 shrink-0 items-center justify-center border-r border-slate-100">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
            </div>
            {weekDays.map((day, idx) => (
              <div key={idx} className={`flex flex-1 flex-col items-center justify-center border-r border-slate-100 py-2.5 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-emerald-50/60' : ''}`}>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEE')}</span>
                <span className={`mt-0.5 text-[15px] font-black ${isSameDay(day, new Date()) ? 'text-emerald-600' : 'text-[#1e293b]'}`}>
                  {format(day, 'd')}
                </span>
                {isSameDay(day, new Date()) && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>}
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
                  <div key={timeIdx} className="flex min-h-[88px] border-b border-slate-50">
                    <div className="flex w-24 shrink-0 items-start justify-center border-r border-slate-100 px-3 py-4">
                      <span className="text-[11px] font-black text-slate-400">{time}</span>
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const appointments = getAppointmentsForSlot(day, time);
                      return (
                        <div key={dayIdx} className="group relative flex-1 border-r border-slate-50 p-2 last:border-r-0">
                          {appointments.length > 0 ? (
                            appointments.map((apt) => {
                              const soonState = getUpcomingSoonState(apt.date, apt.time);
                              const isScheduled = (apt.status ?? '').toLowerCase() === 'scheduled';

                              return (
                              <div 
                                key={apt.appointmentId ?? apt.slotId}
                                className={
                                  isScheduled && soonState.isMissed
                                    ? 'h-full w-full bg-rose-100 border-l-4 border-rose-600 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : isScheduled && soonState.isCheckInLate
                                      ? 'h-full w-full bg-red-50 border-l-4 border-red-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isOverdue
                                    ? 'h-full w-full bg-rose-50 border-l-4 border-rose-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isLive
                                      ? 'h-full w-full bg-emerald-100 border-l-4 border-emerald-600 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isVerySoon
                                    ? 'h-full w-full bg-amber-50 border-l-4 border-amber-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                    : soonState.isSoon
                                      ? 'h-full w-full bg-sky-50 border-l-4 border-sky-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
                                      : 'h-full w-full bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card'
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
                                        ? 'h-5 w-5 rounded-lg bg-rose-200 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : isScheduled && soonState.isCheckInLate
                                          ? 'h-5 w-5 rounded-lg bg-red-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isOverdue
                                        ? 'h-5 w-5 rounded-lg bg-rose-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isLive
                                          ? 'h-5 w-5 rounded-lg bg-emerald-200 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isVerySoon
                                        ? 'h-5 w-5 rounded-lg bg-amber-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                        : soonState.isSoon
                                          ? 'h-5 w-5 rounded-lg bg-sky-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
                                          : 'h-5 w-5 rounded-lg bg-emerald-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity'
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
                                <p className="mt-1 truncate text-xs font-black text-[#1e293b]">{apt.patientName}</p>
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
                                <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-600 shadow-xl hover:scale-110 transition-transform">
                                  <Plus className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default Calendar;
