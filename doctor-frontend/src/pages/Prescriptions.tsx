import React, { useEffect, useState } from 'react';
import api from '@/services/api';

type PrescriptionRow = {
  prescriptionId: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  medicinesSummary?: string;
  prescriptionDate?: string;
};

type PrescriptionListResponse = {
  total: number;
  items: PrescriptionRow[];
};

const Prescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get<PrescriptionListResponse | PrescriptionRow[]>('/doctor/prescriptions');
      const payload = response.data;
      if (Array.isArray(payload)) {
        setPrescriptions(payload);
      } else {
        setPrescriptions(payload?.items ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions', error);
      // Fallback to empty array
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div>
        <button className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
          + New Prescription
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fbf9]">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnosis</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Medicines</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">Loading prescriptions...</td>
              </tr>
            ) : prescriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">No prescriptions yet.</td>
              </tr>
            ) : (
              prescriptions.map((script, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{script.patientName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{script.doctorName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{script.diagnosis || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{script.medicinesSummary || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{script.prescriptionDate || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

export default Prescriptions;
