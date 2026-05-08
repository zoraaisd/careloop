import React, { useState } from 'react';
import api from '@/services/api';

const Automation: React.FC = () => {
  const [bookingLoading, setBookingLoading] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [customMsgLoading, setCustomMsgLoading] = useState(false);

  const handleSendBooking = async () => {
    setBookingLoading(true);
    try {
      await api.post('/doctor/automation/booking-invite');
      alert('Booking Invite sent!');
    } catch (e) {
      console.error(e);
      alert('Failed to send Booking Invite');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSendPrescription = async () => {
    setPrescriptionLoading(true);
    try {
      await api.post('/doctor/automation/prescription-enquiry');
      alert('Prescription Enquiry sent!');
    } catch (e) {
      console.error(e);
      alert('Failed to send Prescription Enquiry');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleSendFollowUp = async () => {
    setFollowUpLoading(true);
    try {
      await api.post('/doctor/automation/follow-up');
      alert('Follow-Up Check sent!');
    } catch (e) {
      console.error(e);
      alert('Failed to send Follow-Up Check');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleSendCustomMessage = async () => {
    setCustomMsgLoading(true);
    try {
      await api.post('/doctor/automation/custom-message');
      alert('Custom Message sent!');
    } catch (e) {
      console.error(e);
      alert('Failed to send Custom Message');
    } finally {
      setCustomMsgLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Booking Invite Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="w-10 h-10 rounded-full border-2 border-green-200 flex items-center justify-center mb-4">
            <span className="text-sm font-bold text-green-700">BI</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">Booking Invite</h3>
          <p className="text-sm text-gray-500 mb-6 h-14">
            Send slot selection message with available appointment times. Patient replies with a number to confirm.
          </p>
          
          <div className="space-y-4 flex-1">
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select patient...</option>
            </select>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select doctor...</option>
            </select>
            <textarea 
              placeholder="Custom message (optional)" 
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 resize-none h-24"
            ></textarea>
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
          <p className="text-sm text-gray-500 mb-6 h-14">
            Ask the patient if they have questions about their prescription. Their reply appears in the chat dashboard.
          </p>
          
          <div className="space-y-4 flex-1">
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select patient...</option>
            </select>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select doctor...</option>
            </select>
            <textarea 
              placeholder="Custom message (optional)" 
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 resize-none h-24"
            ></textarea>
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
          <p className="text-sm text-gray-500 mb-6 h-14">
            Send a follow-up to ask how the patient is feeling. They reply GOOD / SAME / WORSE or type a message.
          </p>
          
          <div className="space-y-4 flex-1">
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none">
              <option>Select patient...</option>
            </select>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none">
              <option>Select doctor...</option>
            </select>
            <textarea 
              placeholder="Custom follow-up message (optional)" 
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none h-24"
            ></textarea>
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
      
      {/* Second Row: Custom Message */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Custom Message Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="w-10 h-10 rounded-full border-2 border-green-200 flex items-center justify-center mb-4">
            <span className="text-sm font-bold text-green-700">CM</span>
          </div>
          <h3 className="text-[17px] font-bold text-gray-900 mb-2">Custom Message</h3>
          <p className="text-sm text-gray-500 mb-6 h-14">
            Send any custom WhatsApp message to a patient from the dashboard.
          </p>
          
          <div className="space-y-4 flex-1">
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select patient...</option>
            </select>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>Select doctor...</option>
            </select>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none">
              <option>English</option>
            </select>
            <textarea 
              placeholder="Type your message..." 
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-green-500 resize-none h-24"
            ></textarea>
          </div>
          
          <button 
            onClick={handleSendCustomMessage}
            disabled={customMsgLoading}
            className="w-full mt-6 py-2.5 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-[15px]"
          >
            {customMsgLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Automation;
