import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface CalendarData {
  doctors: Array<{ doctorId: string; doctorName: string; appointmentCount: number }>;
  summary: { today: number; waiting: number; engaged: number; done: number };
  availableSlots: Array<any>;
  bookedSlots: Array<{
    slotId: string;
    date: string;
    time: string;
    patientName: string;
    patientId: string;
    appointmentId: string;
  }>;
}

import BookAppointmentModal from '@/components/appointments/BookAppointmentModal';

const Calendar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ date: '', time: '' });

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = [...Array(6)].map((_, i) => addDays(startDate, i));

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const dateFrom = format(weekDays[0], 'yyyy-MM-dd');
      const dateTo = format(weekDays[5], 'yyyy-MM-dd');
      const { data } = await api.get(`/doctor/calendar?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      setCalendarData(data);
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

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden bg-[#f8fafc]">
      {/* Modals */}
      <BookAppointmentModal 
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={fetchCalendar}
        initialDate={selectedSlot.date}
        initialTime={selectedSlot.time}
      />

      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 shrink-0 px-1">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b]">Medical Calendar</h2>
          <p className="text-sm text-slate-500 font-medium">Manage your schedule and patient visits</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
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
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => setCurrentDate(new Date())}
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
                  .map((apt) => (
                    <div key={apt.appointmentId} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-600">{apt.time}</span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      </div>
                      <p className="text-[13px] font-black text-[#1e293b] leading-tight truncate">{apt.patientName}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Confirmed Patient</p>
                    </div>
                  ))
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
                            appointments.map((apt) => (
                              <div 
                                key={apt.appointmentId}
                                className="h-full w-full bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Booked</span>
                                  <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                                  </div>
                                </div>
                                <p className="text-sm font-black text-[#1e293b] mt-1 truncate">{apt.patientName}</p>
                                <div className="flex items-center gap-1.5 mt-1 text-emerald-700/70">
                                  <User className="h-3 w-3" />
                                  <span className="text-[11px] font-bold">Patient Visit</span>
                                </div>
                              </div>
                            ))
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
