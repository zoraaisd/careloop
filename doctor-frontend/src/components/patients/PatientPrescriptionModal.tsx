import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Loader2, AlertCircle, Send } from 'lucide-react';
import api from '@/services/api';
import axios from 'axios';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';

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

type MedicineForm = {
  medicineName: string;
  dosage: string;
  instruction: string;
  quantity: number;
};

type PrescriptionForm = {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: MedicineForm[];
  notes: string;
};

interface PatientPrescriptionModalProps {
  patient: { patientId: string; name: string };
  onClose: () => void;
}

const initialMedicine: MedicineForm = {
  medicineName: '',
  dosage: '',
  instruction: '',
  quantity: 1,
};

const validateMedicines = (medicines: MedicineForm[]) => {
  const normalized = medicines.map((medicine) => ({
    medicineName: medicine.medicineName.trim(),
    dosage: medicine.dosage.trim(),
    instruction: medicine.instruction.trim(),
    quantity: Number.isFinite(medicine.quantity) ? medicine.quantity : 0,
  }));

  const hasAnyContent = normalized.some(
    (medicine) => medicine.medicineName || medicine.dosage || medicine.instruction || medicine.quantity > 1,
  );

  if (!hasAnyContent) {
    return { error: 'Add at least one medicine.', validMedicines: [] as MedicineForm[] };
  }

  const invalidIndex = normalized.findIndex(
    (medicine) =>
      !medicine.medicineName || !medicine.dosage || !medicine.instruction || !Number.isInteger(medicine.quantity) || medicine.quantity < 1,
  );

  if (invalidIndex >= 0) {
    return {
      error: `Complete all fields for medicine ${invalidIndex + 1}, including a quantity of at least 1.`,
      validMedicines: [] as MedicineForm[],
    };
  }

  return {
    error: '',
    validMedicines: normalized,
  };
};

const PatientPrescriptionModal: React.FC<PatientPrescriptionModalProps> = ({ patient, onClose }) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<{ userId: string; name: string }[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  
  const [form, setForm] = useState<PrescriptionForm>({
    patientId: patient.patientId,
    doctorId: '',
    diagnosis: '',
    medicines: [{ ...initialMedicine }],
    notes: '',
  });

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

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctor/doctors');
      setDoctors(response.data ?? []);
      if (response.data && response.data.length > 0) {
        setForm(prev => ({ ...prev, doctorId: response.data[0].userId }));
      }
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/doctor/inventory');
      setInventory(response.data.items ?? []);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchDoctors();
    fetchInventory();
  }, [patient.patientId]);

  const handleFormChange = (field: keyof Omit<PrescriptionForm, 'medicines'>) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
    setFormError('');
  };

  const handleMedicineChange = (index: number, field: keyof MedicineForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setForm(prev => {
      const nextMedicines = [...prev.medicines];
      nextMedicines[index] = { ...nextMedicines[index], [field]: value };
      return { ...prev, medicines: nextMedicines };
    });
    setFormError('');
  };

  const addMedicineRow = () => {
    setForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { ...initialMedicine }],
    }));
  };

  const removeMedicineRow = (index: number) => {
    setForm(prev => {
      if (prev.medicines.length === 1) return prev;
      return {
        ...prev,
        medicines: prev.medicines.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId) return setFormError('Please select doctor.');
    if (!form.diagnosis.trim()) return setFormError('Diagnosis is required.');

    const { error, validMedicines } = validateMedicines(form.medicines);
    if (error) return setFormError(error);

    setIsSubmitting(true);
    try {
      await api.post('/doctor/prescriptions', {
        ...form,
        medicines: validMedicines,
      });
      setShowAddForm(false);
      setForm({
        patientId: patient.patientId,
        doctorId: doctors[0]?.userId || '',
        diagnosis: '',
        medicines: [{ ...initialMedicine }],
        notes: '',
      });
      fetchPrescriptions();
      emitDashboardRefresh('patient-prescriptions:create');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message || 'Failed to create prescription');
      } else {
        setFormError('Failed to create prescription');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142e26]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in zoom-in duration-200">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#f8fbf9] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="text-xl font-black text-[#142e26]">Patient Prescriptions</h3>
            <p className="text-xs text-[#607d74] font-medium">Managing prescriptions for <span className="font-bold text-[#1faa62]">{patient.name}</span></p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {!showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-[#1faa62] hover:bg-[#179353] text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
              >
                <Plus className="w-4 h-4" /> New Prescription
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
              <X className="w-6 h-6 text-[#607d74]" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-8">
          {showAddForm ? (
            <div className="space-y-4 rounded-[24px] border border-[#1faa62]/20 bg-[#f8fbf9] p-4 animate-in slide-in-from-top-4 duration-300 sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-[#142e26] uppercase tracking-wider">Create New Prescription</h4>
                <button onClick={() => setShowAddForm(false)} className="text-[#607d74] hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#607d74] uppercase ml-1">Doctor</label>
                    <select
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-[#1faa62] bg-white"
                      value={form.doctorId}
                      onChange={handleFormChange('doctorId')}
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d.userId} value={d.userId}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#607d74] uppercase ml-1">Diagnosis</label>
                    <input
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-[#1faa62]"
                      placeholder="e.g. Fever, Cough"
                      value={form.diagnosis}
                      onChange={handleFormChange('diagnosis')}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#607d74] uppercase ml-1">Medicines</label>
                  {form.medicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 rounded-2xl border border-white/70 bg-white/60 p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.6fr_auto] lg:items-end"
                    >
                      <div className="relative">
                        <input
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                          placeholder="Medicine"
                          value={med.medicineName}
                          onChange={handleMedicineChange(idx, 'medicineName')}
                          onFocus={() => setShowSuggestions(idx)}
                          onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        />
                        {showSuggestions === idx && med.medicineName.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-32 overflow-y-auto">
                            {inventory
                              .filter(item => item.itemName.toLowerCase().includes(med.medicineName.toLowerCase()))
                              .map((item, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="px-3 py-2 hover:bg-[#f4f8f6] cursor-pointer text-[10px] border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    setForm(prev => {
                                      const next = [...prev.medicines];
                                      next[idx] = { 
                                        ...next[idx], 
                                        medicineName: item.itemName,
                                        dosage: item.strengthComposition || next[idx].dosage
                                      };
                                      return { ...prev, medicines: next };
                                    });
                                    setShowSuggestions(null);
                                  }}
                                >
                                  <div className="font-bold">{item.itemName}</div>
                                  <div className="text-[8px] text-[#607d74]">{item.stockQuantity} Left</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <input
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={handleMedicineChange(idx, 'dosage')}
                      />
                      <input
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                        placeholder="Timing"
                        value={med.instruction}
                        onChange={handleMedicineChange(idx, 'instruction')}
                      />
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                        value={med.quantity}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          setForm(prev => {
                            const next = [...prev.medicines];
                            next[idx] = { ...next[idx], quantity: Number.isNaN(val) ? 0 : val };
                            return { ...prev, medicines: next };
                          });
                          setFormError('');
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => removeMedicineRow(idx)}
                        className="justify-self-end p-2 text-red-400 transition-colors hover:text-red-600 disabled:opacity-20 lg:justify-self-auto"
                        disabled={form.medicines.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="w-full py-2 border border-dashed border-[#1faa62]/40 text-[#1faa62] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1faa62]/5 transition-all"
                  >
                    + Add Medicine
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#607d74] uppercase ml-1">Notes</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold outline-none focus:border-[#1faa62] min-h-[60px]"
                    placeholder="Additional instructions..."
                    value={form.notes}
                    onChange={handleFormChange('notes')}
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {formError}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl px-4 py-2 text-xs font-black text-[#607d74] transition-all hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#1faa62] px-6 py-2 text-xs font-black text-white shadow-lg shadow-emerald-100 transition-all hover:bg-[#179353] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Save Prescription
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[#607d74] uppercase tracking-[0.2em]">Prescription History</h4>
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 opacity-20">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm italic">Loading history...</span>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic text-sm border border-dashed border-gray-100 rounded-3xl">
                  No prescriptions recorded yet.
                </div>
              ) : (
                <div className="grid gap-4">
                  {prescriptions.map((p) => (
                    <div key={p.prescriptionId} className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#1faa62] hover:shadow-xl hover:shadow-green-50 transition-all group">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#f8fbf9] rounded-xl flex items-center justify-center text-[#1faa62]">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-[#142e26] uppercase tracking-tight">{p.diagnosis}</h5>
                            <p className="text-[10px] text-[#607d74] font-bold">Dr. {p.doctorName} • {p.prescriptionDate}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-50 text-[#1faa62] text-[9px] font-black rounded-full uppercase tracking-tighter">
                          Verified
                        </div>
                      </div>
                      <div className="space-y-2 sm:pl-[52px]">
                        <p className="text-xs font-bold text-[#142e26] leading-relaxed">
                          <span className="text-[#607d74] font-black text-[9px] uppercase tracking-widest block mb-1">Medicines:</span>
                          {p.medicinesSummary}
                        </p>
                        <p className="text-[10px] font-medium text-[#607d74] italic">
                          {p.instructionsSummary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPrescriptionModal;
