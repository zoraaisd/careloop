import React, { useState, useEffect } from 'react';
import api, { notifySuccess } from '@/services/api';

const Automation: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({ patientId: '', doctorId: '' });
  const [prescriptionForm, setPrescriptionForm] = useState({ patientId: '', doctorId: '' });
  const [followUpForm, setFollowUpForm] = useState({ patientId: '', doctorId: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          api.get('/doctor/patients'),
          api.get('/doctor/doctors')
        ]);
        setPatients(patientsRes.data.items || []);
        setDoctors(doctorsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data for automation', err);
      }
    };
    fetchData();
  }, []);

  const handleSendBooking = async () => {
    if (!bookingForm.patientId) return alert('Please select a patient');
    setBookingLoading(true);
    try {
      await api.post('/doctor/automation/booking-invite', bookingForm);
      notifySuccess('Booking invite sent successfully.');
      setBookingForm({ patientId: '', doctorId: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to send Booking Invite');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSendPrescription = async () => {
    if (!prescriptionForm.patientId) return alert('Please select a patient');
    setPrescriptionLoading(true);
    try {
      await api.post('/doctor/automation/prescription-enquiry', prescriptionForm);
      notifySuccess('Prescription enquiry sent successfully.');
      setPrescriptionForm({ patientId: '', doctorId: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to send Prescription Enquiry');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUpForm.patientId) return alert('Please select a patient');
    setFollowUpLoading(true);
    try {
      await api.post('/doctor/automation/follow-up', followUpForm);
      notifySuccess('Follow-up check sent successfully.');
      setFollowUpForm({ patientId: '', doctorId: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to send Follow-Up Check');
    } finally {
      setFollowUpLoading(false);
    }
  };



  const renderPatientOptions = () => (
    <>
      <option value="">Select patient...</option>
      {patients.map((p) => (
        <option key={p.patientId} value={p.patientId}>
          {p.name} ({p.phone})
        </option>
      ))}
    </>
  );

  const renderDoctorOptions = () => (
    <>
      <option value="">Select doctor...</option>
      {doctors.map((d) => (
        <option key={d.userId} value={d.userId}>
          {d.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        
        {/* Booking Invite Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="w-10 h-10 rounded-full border-2 border-green-200 flex items-center justify-center mb-4">
            <span className="text-sm font-bold text-green-700">BI</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">Booking Invite</h3>
          <p className="mb-6 min-h-14 text-sm text-gray-500">
            Send slot selection message with available appointment times. Patient replies with a number to confirm.
          </p>
          
          <div className="space-y-4 flex-1">
            <select 
              value={bookingForm.patientId}
              onChange={(e) => setBookingForm({ ...bookingForm, patientId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
            >
              {renderPatientOptions()}
            </select>
            <select 
              value={bookingForm.doctorId}
              onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
            >
              {renderDoctorOptions()}
            </select>
          </div>
          
          <button 
            onClick={handleSendBooking}
            disabled={bookingLoading}
            className="w-full mt-6 py-2.5 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-[15px]"
          >
            {bookingLoading ? 'Sending...' : 'Send Booking Invite'}
          </button>
        </div>

        {/* Prescription Enquiry Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="w-10 h-10 rounded-full border-2 border-green-200 flex items-center justify-center mb-4">
            <span className="text-sm font-bold text-green-700">PE</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">Prescription Enquiry</h3>
          <p className="mb-6 min-h-14 text-sm text-gray-500">
            Ask the patient if they have questions about their prescription. Their reply appears in the chat dashboard.
          </p>
          
          <div className="space-y-4 flex-1">
            <select 
              value={prescriptionForm.patientId}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
            >
              {renderPatientOptions()}
            </select>
            <select 
              value={prescriptionForm.doctorId}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
            >
              {renderDoctorOptions()}
            </select>
          </div>
          
          <button 
            onClick={handleSendPrescription}
            disabled={prescriptionLoading}
            className="w-full mt-6 py-2.5 bg-[#0f766e] hover:bg-[#0d645e] text-white font-semibold rounded-lg shadow-sm transition-colors text-[15px]"
          >
            {prescriptionLoading ? 'Sending...' : 'Send Enquiry'}
          </button>
        </div>

        {/* Follow-Up Check Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="w-10 h-10 rounded-full border-2 border-orange-200 flex items-center justify-center mb-4">
            <span className="text-sm font-bold text-orange-600">FU</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">Follow-Up Check</h3>
          <p className="mb-6 min-h-14 text-sm text-gray-500">
            Send a follow-up to ask how the patient is feeling. They reply GOOD / SAME / WORSE or type a message.
          </p>
          
          <div className="space-y-4 flex-1">
            <select 
              value={followUpForm.patientId}
              onChange={(e) => setFollowUpForm({ ...followUpForm, patientId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
            >
              {renderPatientOptions()}
            </select>
            <select 
              value={followUpForm.doctorId}
              onChange={(e) => setFollowUpForm({ ...followUpForm, doctorId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
            >
              {renderDoctorOptions()}
            </select>
          </div>
          
          <button 
            onClick={handleSendFollowUp}
            disabled={followUpLoading}
            className="w-full mt-6 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold rounded-lg shadow-sm transition-colors text-[15px]"
          >
            {followUpLoading ? 'Sending...' : 'Send Follow-Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Automation;
