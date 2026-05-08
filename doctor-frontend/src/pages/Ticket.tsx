import React, { useEffect, useState } from 'react';
import api from '@/services/api';

const Ticket: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/tickets');
      if (response.data) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex gap-4 items-center">
        <button className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm shrink-0">
          + Raise Ticket
        </button>
        <div className="flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="Search support tickets..." 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fbf9]">
            <tr>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Clinic Name</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Title</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">Loading tickets...</td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm">-</td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
                <td className="px-6 py-8 text-center text-gray-500 text-sm"></td>
              </tr>
            ) : (
              tickets.map((ticket, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.clinicName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.issueTitle || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.description || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.status || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.priority || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{ticket.createdDate || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900">View</button>
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

export default Ticket;
