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

const MEDICINE_CATALOG = [
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Aceclofenac', 'Aspirin', 'Cetirizine', 'Levocetirizine',
  'Pantoprazole', 'Omeprazole', 'Rabeprazole', 'Ondansetron', 'Domperidone', 'Metoclopramide',
  'Dicyclomine', 'ORS Powder', 'Antacids', 'Cough Syrup', 'Multivitamins', 'Calcium Tablets',
  'Iron Tablets', 'Zinc Tablets', 'Amoxicillin', 'Azithromycin', 'Cefixime', 'Ceftriaxone',
  'Ciprofloxacin', 'Doxycycline', 'Metronidazole', 'Clindamycin', 'Levofloxacin', 'Metformin',
  'Glimepiride', 'Insulin', 'Voglibose', 'Sitagliptin', 'Amlodipine', 'Telmisartan', 'Losartan',
  'Atenolol', 'Metoprolol', 'Atorvastatin', 'Clopidogrel', 'Salbutamol', 'Budesonide',
  'Montelukast', 'Nebulizer Solutions', 'Clotrimazole Cream', 'Mupirocin Ointment',
  'Hydrocortisone Cream', 'Betadine Ointment', 'Adrenaline', 'Atropine', 'Dopamine',
  'Nitroglycerin', 'Hydrocortisone Injection', 'Dexamethasone', 'IV Fluids', 'Glucose Injection',
  'Tetanus Vaccine', 'Hepatitis B Vaccine', 'Influenza Vaccine', 'Rabies Vaccine', 'COVID-19 Vaccines',
  'Syringes', 'Insulin Syringes', 'IV Cannula', 'IV Sets', 'Extension Tubes', 'Saline Bottles',
  'Ringer Lactate', 'Dextrose', 'Sterile Water', 'Injection Trays', 'Surgical Gloves',
  'Examination Gloves', 'Face Masks', 'N95 Masks', 'Disposable Aprons', 'Cotton Rolls',
  'Gauze Pieces', 'Bandages', 'Micropore Tape', 'Surgical Tape', 'Alcohol Swabs', 'Hand Sanitizer',
  'Tissue Rolls', 'Underpads', 'Disposable Bedsheets', 'Band-Aids', 'Crepe Bandages',
  'Sterile Dressing Pads', 'Sutures', 'Surgical Blades', 'Antiseptic Solution', 'Povidone Iodine',
  'Hydrogen Peroxide', 'Burn Cream', 'Wound Irrigation Solution', 'Blood Glucose Strips',
  'Urine Test Strips', 'Pregnancy Test Kits', 'Rapid Test Kits', 'ECG Gel', 'Ultrasound Gel',
  'Specimen Containers', 'Blood Collection Tubes', 'Stethoscope', 'Thermometer', 'BP Apparatus',
  'Pulse Oximeter', 'Otoscope', 'Ophthalmoscope', 'Reflex Hammer', 'Tongue Depressor', 'Tuning Fork',
  'Surgical Scissors', 'Forceps', 'Needle Holder', 'Dressing Forceps', 'Kidney Tray', 'Patient Monitor',
  'ECG Machine', 'Defibrillator', 'Multipara Monitor', 'Oxygen Concentrator', 'Oxygen Cylinder',
  'Nebulizer', 'Ventilator', 'Suction Machine', 'Ultrasound Machine', 'X-Ray Machine'
];

const PatientPrescriptionModal: React.FC<PatientPrescriptionModalProps> = ({ patient, onClose, initialShowForm = false }) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(initialShowForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingPdfId, setSendingPdfId] = useState<string | null>(null);
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

  const handleSendPdf = async (prescriptionId: string) => {
    setSendingPdfId(prescriptionId);
    try {
      await api.post(`/doctor/prescriptions/${prescriptionId}/send-pdf`);
      fetchPrescriptions();
      emitDashboardRefresh('patient-prescriptions:send-pdf');
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
            {!showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1faa62] px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-100 transition-all hover:bg-[#179353]"
                type="button"
              >
                <Plus className="w-4 h-4" /> New Prescription
              </button>
            )}
            <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white" type="button" title="Close">
              <X className="w-6 h-6 text-[#607d74]" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6 lg:p-8">
          {showAddForm ? (
            <div className="space-y-4 rounded-3xl border border-[#1faa62]/20 bg-[#f8fbf9] p-4 animate-in slide-in-from-top-4 duration-300 sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-[#142e26] uppercase tracking-wider">Create New Prescription</h4>
                  <button onClick={() => setShowAddForm(false)} className="text-[#607d74] transition-colors hover:text-red-500" type="button" title="Cancel">
                    <X className="w-5 h-5" />
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

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#607d74] uppercase ml-1">Medicines</label>
                  {form.medicines.map((med, idx) => {
                    const filteredSuggestions = Array.from(new Set([
                      ...inventory.map(item => item.itemName),
                      ...MEDICINE_CATALOG
                    ])).filter(name => 
                      !med.medicineName || name.toLowerCase().includes(med.medicineName.toLowerCase())
                    ).slice(0, 50);

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-1 gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_90px_auto] lg:items-end lg:gap-2"
                      >
                        <div className="relative">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Medicine</label>
                          <input
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                            placeholder="Medicine"
                            value={med.medicineName}
                            onChange={handleMedicineChange(idx, 'medicineName')}
                            onFocus={() => setShowSuggestions(idx)}
                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                          />
                          {showSuggestions === idx && filteredSuggestions.length > 0 && (
                            <div className="absolute z-[100] w-full mt-1 bg-[#1a1f1e] rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 custom-scrollbar">
                              {filteredSuggestions.map((name, sIdx) => {
                                const invItem = inventory.find(i => i.itemName === name);
                                return (
                                  <div
                                    key={sIdx}
                                    className="px-4 py-2.5 hover:bg-[#2a302f] cursor-pointer text-white transition-colors border-b border-white/5 last:border-0"
                                    onClick={() => {
                                      setForm(prev => {
                                        const next = [...prev.medicines];
                                        next[idx] = { 
                                          ...next[idx], 
                                          medicineName: name,
                                          dosage: invItem?.strengthComposition || next[idx].dosage
                                        };
                                        return { ...prev, medicines: next };
                                      });
                                      setShowSuggestions(null);
                                    }}
                                  >
                                    <div className="text-sm font-bold">{name}</div>
                                    {invItem && (
                                      <div className="text-[10px] text-[#8ea59d] font-medium">{invItem.stockQuantity} Left in Stock</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Dosage</label>
                          <input
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                            placeholder="Dosage"
                            value={med.dosage}
                            onChange={handleMedicineChange(idx, 'dosage')}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Timing</label>
                          <input
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#1faa62]"
                            placeholder="Timing"
                            value={med.instruction}
                            onChange={handleMedicineChange(idx, 'instruction')}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Qty</label>
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
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMedicineRow(idx)}
                          className="justify-self-end rounded-xl p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-20 lg:justify-self-auto"
                          disabled={form.medicines.length === 1}
                          title="Remove Medicine"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

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
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPrescriptionModal;
