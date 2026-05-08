import React, { useEffect, useState } from 'react';
import api from '@/services/api';

const Calendar: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/calendar');
      if (response.data) {
        setAppointments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  const days = [
    { name: 'MON', date: '4 May', count: 0 },
    { name: 'TUE', date: '5 May', count: 0 },
    { name: 'WED', date: '6 May', count: 0 },
    { name: 'THU', date: '7 May', count: 0 },
    { name: 'FRI', date: '8 May', count: 0 },
    { name: 'SAT', date: '9 May', count: 0 }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex gap-4 items-center">
          <input 
            type="text" 
            placeholder="Search patients" 
            className="w-64 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition-colors text-sm">
            Add Patient
          </button>
        </div>
        
        <div className="flex gap-4 items-center">
          <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition-colors text-sm">
            Previous
          </button>
          <span className="font-bold text-gray-900">4 May - 9 May 2026</span>
          <button className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
            Today
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition-colors text-sm">
            Next
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
          
          {/* Doctors Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">Doctors</h3>
            <div className="space-y-3">
              <button className="w-full flex justify-between items-center px-4 py-2 bg-[#e7f3ec] border border-[#1faa62] rounded-lg text-sm font-semibold text-[#142a22]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#1faa62]"></div>
                  All doctors
                </div>
                <span className="text-[#1faa62]">0</span>
              </button>
              
              <button className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#1faa62]"></div>
                  Dhanush
                </div>
                <span className="text-gray-500">0</span>
              </button>
              
              <button className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#1faa62]"></div>
                  Vinisha
                </div>
                <span className="text-gray-500">0</span>
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Total Appointments</div>
                <div className="text-2xl font-bold text-gray-900">0</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Available Slots</div>
                <div className="text-2xl font-bold text-gray-900">0</div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex border-b border-gray-200 shrink-0">
            <div className="w-20 shrink-0 border-r border-gray-200 flex items-center justify-center bg-[#f8fbf9]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</span>
            </div>
            {days.map((day, idx) => (
              <div key={idx} className="flex-1 border-r border-gray-200 last:border-r-0 py-3 flex flex-col items-center justify-center bg-white">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{day.name}</span>
                <span className="text-sm font-bold text-gray-900">{day.date}</span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-[#e7f3ec] text-[#1faa62] text-[10px] font-bold">
                  {day.count}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading calendar...</div>
            ) : (
              <div className="relative">
                {timeSlots.map((time, timeIdx) => (
                  <div key={timeIdx} className="flex border-b border-gray-100 min-h-[80px]">
                    <div className="w-20 shrink-0 border-r border-gray-200 py-3 px-2 flex items-start justify-center bg-[#f8fbf9]">
                      <span className="text-xs font-medium text-gray-500">{time}</span>
                    </div>
                    {days.map((day, dayIdx) => (
                      <div key={dayIdx} className="flex-1 border-r border-gray-100 last:border-r-0 relative hover:bg-gray-50 transition-colors cursor-pointer group">
                        {/* Empty cell, could show a + icon on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                            +
                          </div>
                        </div>
                      </div>
                    ))}
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
