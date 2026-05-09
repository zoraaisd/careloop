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

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <div className="space-y-4">
      <BookAppointmentModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchAppointments}
      />

      <div>
        <button
          className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
          onClick={() => setShowModal(true)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d] font-bold">{appointment.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.doctorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.day || appointment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{appointment.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded bg-emerald-100 text-emerald-800">
                      {appointment.status || 'Scheduled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-emerald-600 hover:text-emerald-900 font-bold" type="button">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Appointments;
