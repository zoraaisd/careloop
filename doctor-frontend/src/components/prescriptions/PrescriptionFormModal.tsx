import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import api, { notifySuccess } from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';

type PatientOption = {
  patientId: string;
  name: string;
  primaryDoctorId?: string | null;
};

type DoctorOption = {
  userId: string;
  name: string;
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

type MedicineFieldErrors = {
  medicineName?: string;
  dosage?: string;
  instruction?: string;
};

type PrescriptionFieldErrors = {
  patientId?: string;
  doctorId?: string;
  diagnosis?: string;
  medicines?: MedicineFieldErrors[];
};

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prescriptionId: string, form: PrescriptionForm) => void;
  initialPatientId?: string;
}

const initialMedicine: MedicineForm = {
  medicineName: '',
  dosage: '',
  instruction: '',
  quantity: 1,
};

const medicineTimingOptions = [
  'Morning/After Food',
  'Morning/Before Food',
  'Afternoon/After Food',
  'Afternoon/Before Food',
  'Evening/After Food',
  'Evening/Before Food',
];

const parseInstructionSelections = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const scrollToValidationTarget = (selector: string) => {
  if (typeof window === 'undefined') return;

  window.requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus?.();
  });
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

const PrescriptionFormModal: React.FC<PrescriptionFormModalProps> = ({ isOpen, onClose, onSuccess, initialPatientId }) => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PrescriptionFieldErrors>({});
  
  const [form, setForm] = useState<PrescriptionForm>({
    patientId: initialPatientId || '',
    doctorId: '',
    diagnosis: '',
    medicines: [{ ...initialMedicine }],
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      void fetchPatients();
      void fetchDoctors();
      void fetchInventory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialPatientId && patients.length > 0) {
      const selected = patients.find(p => p.patientId === initialPatientId);
      if (selected) {
        setForm(prev => ({
          ...prev,
          patientId: selected.patientId,
          doctorId: selected.primaryDoctorId || (doctors[0]?.userId ?? '')
        }));
      }
    }
  }, [initialPatientId, patients, doctors]);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/doctor/patients');
      setPatients(response.data.items ?? []);
    } catch (error) {
      console.error('Failed to fetch patients', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctor/doctors');
      setDoctors(response.data ?? []);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/doctor/inventory');
      setInventory(response.data.items ?? []);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    }
  };

  const handleFormChange =
    (field: keyof Omit<PrescriptionForm, 'medicines'>) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      if (field === 'patientId') {
        const selectedPatient = patients.find((patient) => patient.patientId === value);
        const assignedDoctorId = selectedPatient?.primaryDoctorId ?? '';
        setForm((current) => ({
          ...current,
          patientId: value,
          doctorId:
            assignedDoctorId && doctors.some((doctor) => doctor.userId === assignedDoctorId)
              ? assignedDoctorId
              : (doctors[0]?.userId ?? ''),
        }));
      } else {
        setForm((current) => ({ ...current, [field]: value }));
      }
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setFormError('');
    };

  const handleMedicineChange =
    (index: number, field: keyof MedicineForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((current) => {
        const next = [...current.medicines];
        next[index] = { ...next[index], [field]: value };
        return { ...current, medicines: next };
      });
      setFieldErrors((current) => {
        const nextMedicineErrors = [...(current.medicines ?? [])];
        nextMedicineErrors[index] = { ...nextMedicineErrors[index], [field]: undefined };
        return { ...current, medicines: nextMedicineErrors };
      });
      setFormError('');
    };

  const toggleMedicineTiming = (index: number, option: string) => {
    setForm((current) => {
      const next = [...current.medicines];
      const selectedOptions = parseInstructionSelections(next[index]?.instruction || '');
      const isSelected = selectedOptions.includes(option);
      const nextSelections = isSelected
        ? selectedOptions.filter((item) => item !== option)
        : [...selectedOptions, option];

      next[index] = {
        ...next[index],
        instruction: nextSelections.join(', '),
      };

      return { ...current, medicines: next };
    });
    setFieldErrors((current) => {
      const nextMedicineErrors = [...(current.medicines ?? [])];
      nextMedicineErrors[index] = { ...nextMedicineErrors[index], instruction: undefined };
      return { ...current, medicines: nextMedicineErrors };
    });
    setFormError('');
  };

  const addMedicineRow = () => {
    setForm((current) => ({
      ...current,
      medicines: [...current.medicines, { ...initialMedicine }],
    }));
  };

  const removeMedicineRow = (index: number) => {
    setForm((current) => {
      if (current.medicines.length === 1) return current;
      return {
        ...current,
        medicines: current.medicines.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleCreatePrescription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: PrescriptionFieldErrors = {};
    const medicineErrors: MedicineFieldErrors[] = form.medicines.map(() => ({}));

    if (!form.patientId) nextErrors.patientId = 'Please select patient.';
    if (!form.doctorId) nextErrors.doctorId = 'Please select doctor.';
    if (!form.diagnosis.trim()) nextErrors.diagnosis = 'Diagnosis is required.';

    form.medicines.forEach((item, index) => {
      if (!item.medicineName.trim()) medicineErrors[index]!.medicineName = 'Medicine name is required.';
      if (!item.dosage.trim()) medicineErrors[index]!.dosage = 'Dosage is required.';
      if (!item.instruction.trim()) medicineErrors[index]!.instruction = 'Select at least one timing.';
    });

    if (medicineErrors.some((item) => Object.keys(item).length > 0)) {
      nextErrors.medicines = medicineErrors;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError('');

      if (nextErrors.patientId) {
        scrollToValidationTarget('[data-validation-field="patientId"]');
      } else if (nextErrors.doctorId) {
        scrollToValidationTarget('[data-validation-field="doctorId"]');
      } else if (nextErrors.diagnosis) {
        scrollToValidationTarget('[data-validation-field="diagnosis"]');
      } else if (nextErrors.medicines) {
        const firstMedicineErrorIndex = nextErrors.medicines.findIndex((item) => Object.keys(item).length > 0);
        if (firstMedicineErrorIndex >= 0) {
          const firstMedicineError = nextErrors.medicines[firstMedicineErrorIndex];
          if (firstMedicineError?.medicineName) {
            scrollToValidationTarget(`[data-validation-field="medicineName-${firstMedicineErrorIndex}"]`);
          } else if (firstMedicineError?.dosage) {
            scrollToValidationTarget(`[data-validation-field="dosage-${firstMedicineErrorIndex}"]`);
          } else if (firstMedicineError?.instruction) {
            scrollToValidationTarget(`[data-validation-field="instruction-${firstMedicineErrorIndex}"]`);
          }
        }
      }

      return;
    }

    setIsSubmitting(true);
    try {
      setFieldErrors({});
      const response = await api.post<{ message: string; prescriptionId: string }>('/doctor/prescriptions', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        diagnosis: form.diagnosis.trim(),
        medicines: form.medicines.map((item) => ({
          medicineName: item.medicineName.trim(),
          dosage: item.dosage.trim(),
          instruction: item.instruction.trim(),
          quantity: item.quantity,
        })),
        notes: form.notes.trim() || undefined,
      });

      emitDashboardRefresh('prescriptions:create');
      notifySuccess('Prescription created successfully.');
      onSuccess(response.data.prescriptionId, form);
      onClose();
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(error.response?.data?.message ?? 'Failed to create prescription.');
      } else {
        setFormError('Failed to create prescription.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isPatientSelectionLocked = Boolean(initialPatientId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6 transition-all">
      <div className="w-full max-w-[1120px] max-h-full flex flex-col rounded-[30px] bg-white border border-[#c8d7d1] shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#d6e1dc] px-10 py-6 shrink-0">
          <h3 className="text-2xl font-bold text-[#122c24]">New Prescription</h3>
          <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#607d74] transition-all hover:bg-gray-100" onClick={onClose} type="button">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <form className="flex-1 space-y-7 overflow-y-auto px-10 py-7" onSubmit={handleCreatePrescription}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Patient</label>
              <select
                className="h-14 w-full rounded-2xl border border-[#c8d7d1] px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-[#1faa62]/10 bg-white disabled:bg-[#f8fbf9] disabled:text-[#607d74] disabled:cursor-not-allowed"
                data-validation-field="patientId"
                onChange={handleFormChange('patientId')}
                value={form.patientId}
                disabled={isPatientSelectionLocked}
              >
                <option value="">Select Patient *</option>
                {patients.map((patient) => (
                  <option key={patient.patientId} value={patient.patientId}>
                    {patient.name}
                  </option>
                ))}
              </select>
              {fieldErrors.patientId ? <p className="ml-1 text-xs font-semibold text-red-600">{fieldErrors.patientId}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Doctor</label>
              <select
                className="h-14 w-full rounded-2xl border border-[#c8d7d1] px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-[#1faa62]/10 bg-white"
                data-validation-field="doctorId"
                onChange={handleFormChange('doctorId')}
                value={form.doctorId}
              >
                <option value="">Select Doctor *</option>
                {doctors.map((doctor) => (
                  <option key={doctor.userId} value={doctor.userId}>
                    {doctor.name}
                  </option>
                ))}
              </select>
              {fieldErrors.doctorId ? <p className="ml-1 text-xs font-semibold text-red-600">{fieldErrors.doctorId}</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Diagnosis</label>
            <input
              className="h-14 w-full rounded-2xl border border-[#c8d7d1] px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-[#1faa62]/10"
              data-validation-field="diagnosis"
              onChange={handleFormChange('diagnosis')}
              placeholder="What is the diagnosis?"
              value={form.diagnosis}
            />
            {fieldErrors.diagnosis ? <p className="ml-1 text-xs font-semibold text-red-600">{fieldErrors.diagnosis}</p> : null}
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-xs font-bold uppercase text-[#516c63]">Medicines</label>
            <div className="overflow-hidden rounded-[26px] border border-[#d7e2dd] bg-white">
              <div className="hidden border-b border-[#d7e2dd] bg-[#fbfdfc] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,2.2fr)_110px_92px]">
                {['Medicine Name', 'Dosage', 'Timing', 'Days', 'Actions'].map((heading) => (
                  <div key={heading} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-[#39574d]">
                    {heading}
                  </div>
                ))}
              </div>
              {form.medicines.map((medicine, idx) => {
                const filteredSuggestions = Array.from(new Set([
                  ...inventory.map(item => item.itemName),
                  ...MEDICINE_CATALOG
                ])).filter(name => 
                  !medicine.medicineName || name.toLowerCase().includes(medicine.medicineName.toLowerCase())
                ).slice(0, 50);

                return (
                  <div
                    className="grid grid-cols-1 gap-4 border-b border-[#e3ece7] p-4 last:border-b-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,2.2fr)_110px_92px] lg:items-start"
                    key={`med-${idx}`}
                  >
                    <div className="relative space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#607d74] lg:hidden">Medicine Name</div>
                      <input
                        className="h-12 w-full rounded-xl border border-[#c8d7d1] px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-[#1faa62]/10"
                        data-validation-field={`medicineName-${idx}`}
                        onChange={(e) => {
                          handleMedicineChange(idx, 'medicineName')(e);
                          setShowSuggestions(idx);
                        }}
                        onFocus={() => setShowSuggestions(idx)}
                        onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        placeholder="Enter medicine name"
                        value={medicine.medicineName}
                      />
                      {fieldErrors.medicines?.[idx]?.medicineName ? <p className="text-xs font-semibold text-red-600">{fieldErrors.medicines[idx]!.medicineName}</p> : null}
                      {showSuggestions === idx && medicine.medicineName.length > 0 && filteredSuggestions.length > 0 && (
                        <div className="absolute z-[110] mt-2 max-h-40 w-full overflow-y-auto rounded-xl border border-[#c8d7d1] bg-[#1a1f1e] shadow-2xl">
                          {filteredSuggestions.map((name, sIdx) => {
                            const invItem = inventory.find(i => i.itemName === name);
                            return (
                              <div
                                key={`sugg-${sIdx}`}
                                className="cursor-pointer border-b border-white/5 px-4 py-3 text-sm text-white hover:bg-[#2a302f] last:border-0"
                                onClick={() => {
                                  setForm((current) => {
                                    const next = [...current.medicines];
                                    next[idx] = {
                                      ...next[idx],
                                      medicineName: name,
                                      dosage: invItem?.strengthComposition || next[idx].dosage,
                                    };
                                    return { ...current, medicines: next };
                                  });
                                  setShowSuggestions(null);
                                }}
                              >
                                <div className="font-bold">{name}</div>
                                {invItem && (
                                  <div className="text-[10px] font-bold uppercase tracking-tight text-[#8ea59d]">
                                    {invItem.category} | {invItem.stockQuantity} Left
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#607d74] lg:hidden">Dosage</div>
                      <input
                        className="h-12 w-full rounded-xl border border-[#c8d7d1] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#1faa62]/10"
                        data-validation-field={`dosage-${idx}`}
                        onChange={handleMedicineChange(idx, 'dosage')}
                        value={medicine.dosage}
                        placeholder="Dosage"
                      />
                      {fieldErrors.medicines?.[idx]?.dosage ? <p className="text-xs font-semibold text-red-600">{fieldErrors.medicines[idx]!.dosage}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#607d74] lg:hidden">Timing</div>
                      <div className="rounded-xl border border-[#d7e2dd] bg-[#fcfdfd] p-3" data-validation-field={`instruction-${idx}`} tabIndex={-1}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {medicineTimingOptions.map((option) => {
                            const checked = parseInstructionSelections(medicine.instruction).includes(option);
                            const isMorning = option.startsWith('Morning');
                            const isAfternoon = option.startsWith('Afternoon');
                            const iconClass = isMorning
                              ? 'bg-[#fff5d8] text-[#e0a11d]'
                              : isAfternoon
                                ? 'bg-[#ffeecf] text-[#e29b22]'
                                : 'bg-[#efe9ff] text-[#7160dc]';
                            return (
                              <label
                                key={`${idx}-${option}`}
                                className={`flex min-h-[56px] cursor-pointer items-start gap-2 rounded-xl border px-2 py-2 text-left transition ${
                                  checked
                                    ? 'border-[#1faa62] bg-[#ecf8f1]'
                                    : 'border-[#edf2f0] bg-white hover:border-[#d1e6db]'
                                }`}
                              >
                                <input
                                  checked={checked}
                                  className="mt-1 h-3.5 w-3.5 accent-[#1faa62]"
                                  onChange={() => toggleMedicineTiming(idx, option)}
                                  type="checkbox"
                                />
                                <div className="flex items-start gap-1.5">
                                  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${iconClass}`}>
                                    {isMorning ? 'M' : isAfternoon ? 'A' : 'E'}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-[#17352d] leading-tight truncate">{option.split('/')[0]}</div>
                                    <div className="text-[9px] font-medium text-[#607d74] leading-tight truncate">({option.split('/')[1]})</div>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {fieldErrors.medicines?.[idx]?.instruction ? <p className="text-xs font-semibold text-red-600">{fieldErrors.medicines[idx]!.instruction}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#607d74] lg:hidden">Days</div>
                      <input
                        className="h-12 w-full rounded-xl border border-[#c8d7d1] px-4 text-center text-sm font-bold outline-none focus:ring-4 focus:ring-[#1faa62]/10"
                        type="number"
                        min="1"
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setForm((current) => {
                            const next = [...current.medicines];
                            next[idx] = { ...next[idx], quantity: val };
                            return { ...current, medicines: next };
                          });
                        }}
                        value={medicine.quantity}
                      />
                    </div>

                    <div className="flex items-start justify-start lg:justify-center lg:pt-2">
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-50 bg-white text-red-400 transition-all hover:bg-red-50 disabled:opacity-30"
                        disabled={form.medicines.length === 1}
                        onClick={() => removeMedicineRow(idx)}
                        type="button"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="w-full rounded-2xl border-2 border-dashed border-[#1faa62]/30 py-3.5 text-sm font-bold text-[#1faa62] transition-all hover:bg-[#1faa62]/5"
              onClick={addMedicineRow}
              type="button"
            >
              + Add Another Medicine
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Additional Instructions</label>
            <textarea
              className="min-h-[130px] w-full rounded-2xl border border-[#c8d7d1] px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-[#1faa62]/10" maxLength={500}
              onChange={handleFormChange('notes')}
              placeholder="Any extra notes for the patient?"
              value={form.notes}
            />
          </div>

          {formError ? (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3 text-red-700 text-sm font-semibold">
              <X className="h-5 w-5 text-red-500" />
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-4 border-t border-[#d6e1dc] pt-6">
            <button
              className="min-w-[148px] rounded-2xl border border-[#c8d7d1] px-6 py-3 text-sm font-bold text-[#27483d] transition-all hover:bg-[#f4f8f6]"
              onClick={onClose}
              type="button"
            >
              Discard
            </button>
            <button
              className="min-w-[230px] rounded-2xl bg-[#1faa62] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#179353] hover:shadow-green-200 active:scale-95 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionFormModal;
