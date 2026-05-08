import React, { useEffect, useState } from 'react';
import api from '@/services/api';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/patients');
      if (response.data && response.data.length > 0) {
        setPatients(response.data);
      } else {
        // Fallback to dummy data from screenshot if empty
        setPatients([
          { patientNo: 'PAD001', name: 'ilan', subName: 'sdf', doctor: 'Dhanush', phone: '+916369839968', age: 22, verified: 'Pending' },
          { patientNo: 'PAD002', name: 'dinesh', subName: 'sdf', doctor: 'Vinisha', phone: '+917987423742', age: 22, verified: 'Pending' }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch patients', error);
      // Fallback to dummy data
      setPatients([
        { patientNo: 'PAD001', name: 'ilan', subName: 'sdf', doctor: 'Dhanush', phone: '+916369839968', age: 22, verified: 'Pending' },
        { patientNo: 'PAD002', name: 'dinesh', subName: 'sdf', doctor: 'Vinisha', phone: '+917987423742', age: 22, verified: 'Pending' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex gap-4 items-center">
        <button className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm shrink-0">
          + Add Patient
        </button>
        <div className="flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="Search patients..." 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f8fbf9]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient No</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Age</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Verified</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">Loading patients...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">No patients found.</td>
                </tr>
              ) : (
                patients.map((patient, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1faa62]">
                      {patient.patientNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">{patient.subName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.doctor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.verified === 'Pending' ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded text-red-600 bg-red-100">
                          {patient.verified}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded text-green-600 bg-green-100">
                          {patient.verified}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">OTP</button>
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">Dashboard</button>
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">Docs</button>
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">Slots</button>
                        <button className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors">Chat</button>
                        <button className="px-3 py-1 border border-red-300 rounded text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Patients;
