import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Loader2, Send, Calendar } from 'lucide-react';
import api, { notifySuccess } from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';
import PrescriptionFormModal from '@/components/prescriptions/PrescriptionFormModal';

type PrescriptionRow = {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  medicinesSummary?: string;
  instructionsSummary?: string;
  prescriptionDate?: string;
  pdfUrl?: string;
};

interface PatientPrescriptionModalProps {
  patient: { patientId: string; name: string };
  onClose: () => void;
  initialShowForm?: boolean;
}

const PatientPrescriptionModal: React.FC<PatientPrescriptionModalProps> = ({ patient, onClose, initialShowForm = false }) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(initialShowForm);
  const [sendingPdfId, setSendingPdfId] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctor/prescriptions/patient/${patient.patientId}`);
      setPrescriptions(response.data.items ?? []);
    } catch (err) {
      console.error('Failed to fetch prescriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [patient.patientId]);

  const handlePrescriptionSuccess = () => {
    void fetchPrescriptions();
  };

  const handleSendPdf = async (prescriptionId: string) => {
    setSendingPdfId(prescriptionId);
    try {
      await api.post(`/doctor/prescriptions/${prescriptionId}/send-pdf`);
      fetchPrescriptions();
      emitDashboardRefresh('patient-prescriptions:send-pdf');
      notifySuccess('Prescription PDF sent successfully.');
    } catch (error) {
      console.error('Failed to send PDF', error);
      alert('Failed to send PDF via WhatsApp. Please check Twilio configuration.');
    } finally {
      setSendingPdfId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142e26]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl animate-in zoom-in duration-200 sm:rounded-[32px]">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#f8fbf9] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-8">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-[#142e26]">Patient Prescriptions</h3>
            <p className="text-xs text-[#607d74] font-medium">Managing prescriptions for <span className="font-bold text-[#1faa62]">{patient.name}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1faa62] px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-100 transition-all hover:bg-[#179353]"
              type="button"
            >
              <Plus className="w-4 h-4" /> New Prescription
            </button>
            <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white" type="button" title="Close">
              <X className="w-6 h-6 text-[#607d74]" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6 lg:p-8">
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Medical Archive</h4>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg">{prescriptions.length} Records</span>
              </div>

              {loading ? (
                <div className="py-24 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Decrypting medical vault...</p>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="py-24 text-center bg-slate-50/50 rounded-[48px] border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-white rounded-[32px] shadow-sm flex items-center justify-center text-slate-200 mx-auto mb-6">
                    <FileText className="w-10 h-10" />
                  </div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No prescription history found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {prescriptions.map((p) => (
                    <div key={p.prescriptionId} className="group rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-[#1faa62] hover:shadow-xl hover:shadow-green-50 sm:p-5">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#f8fbf9] rounded-xl flex items-center justify-center text-[#1faa62]">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-base font-black text-[#122c24] tracking-tight">{p.diagnosis}</h5>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dr. {p.doctorName}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> {p.prescriptionDate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase tracking-widest border border-emerald-100 shadow-sm">
                            Digitally Verified
                          </div>
                          <button
                            onClick={() => handleSendPdf(p.prescriptionId)}
                            disabled={sendingPdfId !== null}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#122c24] px-4 py-2 text-[10px] font-black text-white shadow-lg transition-all hover:bg-black disabled:opacity-50"
                            type="button"
                          >
                            {sendingPdfId === p.prescriptionId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Send PDF to Patient
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4 sm:pl-19">
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">Prescribed Medicines</span>
                          <p className="text-sm font-bold text-[#122c24] leading-relaxed">
                            {p.medicinesSummary}
                          </p>
                        </div>
                        {p.instructionsSummary && (
                          <div className="p-4 bg-white/60 rounded-2xl border border-slate-100/50">
                            <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                              {p.instructionsSummary}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>

      <PrescriptionFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handlePrescriptionSuccess}
        initialPatientId={patient.patientId}
      />
    </div>
  );
};

export default PatientPrescriptionModal;
