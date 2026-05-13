import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Loader2, AlertCircle, Send, Calendar } from 'lucide-react';
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
  initialShowForm?: boolean;
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

const PatientPrescriptionModal: React.FC<PatientPrescriptionModalProps> = ({ patient, onClose, initialShowForm = false }) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(initialShowForm);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[48px] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in zoom-in duration-300 border border-white/20">
        <div className="flex flex-col gap-4 border-b border-slate-50 p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-3xl font-black text-[#122c24] tracking-tight">Prescriptions</h3>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Managing Rx for <span className="text-emerald-600">{patient.name}</span></p>
          </div>
          <div className="flex items-center gap-4">
            {!showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-8 py-3.5 bg-[#122c24] text-white text-xs font-black rounded-full transition-all flex items-center gap-3 shadow-xl shadow-slate-200 hover:bg-black active:scale-95"
              >
                <Plus className="w-4 h-4" /> New Prescription
              </button>
            )}
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all hover:rotate-90 text-slate-400">
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-10 overflow-y-auto custom-scrollbar p-10 pt-6">
          {showAddForm ? (
            <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Clinical Formulation</h4>
                <button onClick={() => setShowAddForm(false)} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">
                  Discard Draft
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prescribing Doctor</label>
                    <div className="relative">
                      <select
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none shadow-sm cursor-pointer"
                        value={form.doctorId}
                        onChange={handleFormChange('doctorId')}
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map(d => (
                          <option key={d.userId} value={d.userId}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Diagnosis</label>
                    <input
                      className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                      placeholder="e.g. Acute Respiratory Infection"
                      value={form.diagnosis}
                      onChange={handleFormChange('diagnosis')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medication Regimen</label>
                  <div className="space-y-3">
                    {form.medicines.map((med, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 gap-4 rounded-[32px] border border-slate-100 bg-slate-50/50 p-6 lg:grid-cols-[1.5fr_1fr_1.2fr_0.6fr_auto] lg:items-center"
                      >
                        <div className="relative">
                          <input
                            className="w-full h-12 rounded-2xl border border-slate-100 bg-white px-4 text-xs font-bold outline-none focus:border-emerald-500 shadow-sm"
                            placeholder="Medicine Name"
                            value={med.medicineName}
                            onChange={handleMedicineChange(idx, 'medicineName')}
                            onFocus={() => setShowSuggestions(idx)}
                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                          />
                          {showSuggestions === idx && med.medicineName.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden p-2">
                              {inventory
                                .filter(item => item.itemName.toLowerCase().includes(med.medicineName.toLowerCase()))
                                .map((item, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="px-4 py-3 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors border-b border-slate-50 last:border-0"
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
                                    <div className="text-xs font-black text-[#122c24]">{item.itemName}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.stockQuantity} Units In Stock</div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        <input
                          className="w-full h-12 rounded-2xl border border-slate-100 bg-white px-4 text-xs font-bold outline-none focus:border-emerald-500 shadow-sm"
                          placeholder="Dosage (500mg)"
                          value={med.dosage}
                          onChange={handleMedicineChange(idx, 'dosage')}
                        />
                        <input
                          className="w-full h-12 rounded-2xl border border-slate-100 bg-white px-4 text-xs font-bold outline-none focus:border-emerald-500 shadow-sm"
                          placeholder="Timing (1-0-1)"
                          value={med.instruction}
                          onChange={handleMedicineChange(idx, 'instruction')}
                        />
                        <input
                          type="number"
                          min={1}
                          className="w-full h-12 rounded-2xl border border-slate-100 bg-white px-4 text-xs font-bold outline-none focus:border-emerald-500 shadow-sm text-center"
                          value={med.quantity}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value, 10);
                            setForm(prev => {
                              const next = [...prev.medicines];
                              next[idx] = { ...next[idx], quantity: Number.isNaN(val) ? 0 : val };
                              return { ...prev, medicines: next };
                            });
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => removeMedicineRow(idx)}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-20"
                          disabled={form.medicines.length === 1}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="w-full py-4 border-2 border-dashed border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-[24px] hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all group"
                  >
                    <span className="flex items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" /> Append Medication Row
                    </span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clinical Remarks</label>
                  <textarea
                    className="w-full rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all min-h-[100px] shadow-sm"
                    placeholder="Provide detailed clinical notes or patient instructions..."
                    value={form.notes}
                    onChange={handleFormChange('notes')}
                  />
                </div>

                {formError && (
                  <div className="p-5 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in zoom-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {formError}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 h-16 rounded-[24px] border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] h-16 rounded-[24px] bg-[#122c24] text-white text-sm font-black shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Finalize & Generate RX
                  </button>
                </div>
              </form>
            </div>
          ) : (
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
                    <div key={p.prescriptionId} className="group p-8 bg-slate-50/80 hover:bg-white border border-transparent hover:border-emerald-200 rounded-[40px] transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-100/50">
                      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-[22px] shadow-sm flex items-center justify-center text-emerald-600 border border-slate-50 group-hover:scale-110 transition-transform">
                            <FileText className="w-7 h-7" />
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
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase tracking-widest border border-emerald-100 shadow-sm">
                          Digitally Verified
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPrescriptionModal;
