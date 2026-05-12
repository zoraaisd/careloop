import axios from 'axios';
import React, { useEffect, useState } from 'react';
import api from '@/services/api';

type PrescriptionRow = {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
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

type PatientOption = {
  patientId: string;
  name: string;
  primaryDoctorId?: string | null;
};

type PatientListResponse = {
  items: PatientOption[];
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

const initialMedicine: MedicineForm = {
  medicineName: '',
  dosage: '',
  instruction: '',
  quantity: 1,
};

const initialForm: PrescriptionForm = {
  patientId: '',
  doctorId: '',
  diagnosis: '',
  medicines: [{ ...initialMedicine }],
  notes: '',
};

const Prescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<PrescriptionForm>(initialForm);
  const [formError, setFormError] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

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
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get<PatientListResponse>('/doctor/patients');
      setPatients(response.data.items ?? []);
    } catch (error) {
      console.error('Failed to fetch patients', error);
      setPatients([]);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get<DoctorOption[]>('/doctor/doctors');
      setDoctors(response.data ?? []);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
      setDoctors([]);
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

  useEffect(() => {
    void fetchPrescriptions();
    void fetchPatients();
    void fetchDoctors();
    void fetchInventory();
  }, []);

  const openModal = () => {
    setForm({
      ...initialForm,
      patientId: selectedPatient?.id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
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
              : '',
        }));
      } else {
        setForm((current) => ({ ...current, [field]: value }));
      }
      setFormError('');
    };

  useEffect(() => {
    if (!form.patientId || doctors.length === 0) {
      return;
    }

    const selectedPatient = patients.find((patient) => patient.patientId === form.patientId);
    const assignedDoctorId = selectedPatient?.primaryDoctorId;
    if (!assignedDoctorId) {
      return;
    }

    const doctorExists = doctors.some((doctor) => doctor.userId === assignedDoctorId);
    if (!doctorExists || form.doctorId === assignedDoctorId) {
      return;
    }

    setForm((current) => ({
      ...current,
      doctorId: assignedDoctorId,
    }));
  }, [doctors, form.doctorId, form.patientId, patients]);

  const handleMedicineChange =
    (index: number, field: keyof MedicineForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((current) => {
        const next = [...current.medicines];
        next[index] = { ...next[index], [field]: value };
        return { ...current, medicines: next };
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

    if (!form.patientId) return setFormError('Please select patient.');
    if (!form.doctorId) return setFormError('Please select doctor.');
    if (!form.diagnosis.trim()) return setFormError('Diagnosis is required.');

    const validMedicines = form.medicines.filter(
      (item) => item.medicineName.trim() && item.dosage.trim() && item.instruction.trim(),
    );
    if (validMedicines.length === 0) return setFormError('Add at least one medicine.');

    setIsSubmitting(true);
    try {
      await api.post('/doctor/prescriptions', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        diagnosis: form.diagnosis.trim(),
        medicines: validMedicines.map((item) => ({
          medicineName: item.medicineName.trim(),
          dosage: item.dosage.trim(),
          instruction: item.instruction.trim(),
          quantity: item.quantity,
        })),
        notes: form.notes.trim() || undefined,
      });

      setShowModal(false);
      await fetchPrescriptions();
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

  // Group prescriptions by patient
  const patientGroups = Array.from(
    new Map(
      prescriptions
        .filter(p => p.patientId && p.patientName)
        .map(p => [
          p.patientId,
          { 
            id: p.patientId, 
            name: p.patientName, 
            count: prescriptions.filter(pr => pr.patientId === p.patientId).length,
            latestDate: prescriptions.find(pr => pr.patientId === p.patientId)?.prescriptionDate
          }
        ])
    ).values()
  );

  const filteredPrescriptions = selectedPatient 
    ? prescriptions.filter(p => p.patientId === selectedPatient.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedPatient && (
            <button 
              onClick={() => setSelectedPatient(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-2xl font-bold text-[#122c24]">
            {selectedPatient ? `Prescription History: ${selectedPatient.name}` : 'Patient Prescriptions'}
          </h2>
        </div>
        <button
          className="px-6 py-2.5 bg-[#1faa62] hover:bg-[#199453] text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
          onClick={openModal}
          type="button"
        >
          + New Prescription
        </button>
      </div>

      {!selectedPatient ? (
        // Patient Full-Width Card View
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center text-gray-500 font-medium">
              Loading patients...
            </div>
          ) : patientGroups.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 font-medium">
              No prescription records found.
            </div>
          ) : (
            patientGroups.map((patient) => (
              <div 
                key={patient.id}
                onClick={() => setSelectedPatient({ id: patient.id, name: patient.name })}
                className="group relative bg-white rounded-[24px] border border-[#d6e1dc] p-5 shadow-sm hover:shadow-lg hover:border-[#1faa62]/30 transition-all cursor-pointer overflow-hidden flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#f0f9f4] flex-shrink-0 flex items-center justify-center text-[#1faa62] font-bold text-2xl border border-[#1faa62]/10 group-hover:scale-110 transition-transform">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-[#122c24] text-xl group-hover:text-[#1faa62] transition-colors">{patient.name}</h4>
                    <span className="px-3 py-1 bg-[#f4f8f6] text-[#1faa62] rounded-full text-[11px] font-bold uppercase tracking-wider">
                      {patient.count} {patient.count === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm font-semibold text-[#607d74]">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-300">●</span>
                        <span>Patient ID: <span className="text-[#122c24] font-bold">{patient.id.slice(0, 8)}</span></span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-300">●</span>
                        <span>Last Visit: <span className="text-[#122c24] font-bold">{patient.latestDate || 'N/A'}</span></span>
                     </div>
                  </div>
                </div>

                <div className="flex-shrink-0 p-3 rounded-xl bg-gray-50 text-[#1faa62] group-hover:bg-[#1faa62] group-hover:text-white transition-all transform translate-x-2 group-hover:translate-x-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Prescription Detail View
        <div className="bg-white rounded-[32px] shadow-sm border border-[#bfd0c8] overflow-hidden">
          <table className="min-w-full divide-y divide-[#d7e2dd]">
            <thead className="bg-[#f8fbf9]">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-bold text-[#516c63] uppercase tracking-widest" scope="col">Doctor</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-[#516c63] uppercase tracking-widest" scope="col">Diagnosis</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-[#516c63] uppercase tracking-widest" scope="col">Medicines</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-[#516c63] uppercase tracking-widest" scope="col">Date</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-[#516c63] uppercase tracking-widest" scope="col">How to Take (Instructions)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e0e9e4]">
              {filteredPrescriptions.length === 0 ? (
                <tr>
                  <td className="px-8 py-20 text-center text-[#6e847c] text-sm" colSpan={5}>No prescriptions found for this patient.</td>
                </tr>
              ) : (
                filteredPrescriptions.map((row) => (
                  <tr className="hover:bg-[#fcfdfc] transition-colors" key={row.prescriptionId}>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="font-bold text-[#17352d]">{row.doctorName || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold inline-block">
                        {row.diagnosis || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-[#455c54] font-medium">
                      {row.medicinesSummary || 'N/A'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-[#17352d]">{row.prescriptionDate || 'N/A'}</td>
                    <td className="px-8 py-6 text-sm text-[#1faa62] font-bold italic">
                      {(row as any).instructionsSummary || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6 transition-all">
          <div className="w-full max-w-[720px] max-h-full flex flex-col rounded-[24px] bg-white border border-[#c8d7d1] shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#d6e1dc] px-6 py-4 bg-gray-50/50 shrink-0">
              <h3 className="text-2xl font-bold text-[#122c24]">New Prescription</h3>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-[#607d74] transition-all" onClick={closeModal} type="button">
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <form className="px-6 py-5 space-y-4 overflow-y-auto flex-1" onSubmit={handleCreatePrescription}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Patient</label>
                  <select
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 bg-white font-medium"
                    onChange={handleFormChange('patientId')}
                    value={form.patientId}
                  >
                    <option value="">Select Patient *</option>
                    {patients.map((patient) => (
                      <option key={patient.patientId} value={patient.patientId}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Doctor</label>
                  <select
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 bg-white font-medium"
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
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Diagnosis / Reason</label>
                <input
                  className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 font-medium"
                  onChange={handleFormChange('diagnosis')}
                  placeholder="What is the diagnosis?"
                  value={form.diagnosis}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Medicines</label>
                {form.medicines.map((medicine, idx) => (
                  <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_0.5fr_auto] gap-3 bg-[#f8fbf9] p-3 rounded-2xl border border-[#e0e9e4]" key={`med-${idx}`}>
                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 font-bold"
                        onChange={(e) => {
                          handleMedicineChange(idx, 'medicineName')(e);
                          setShowSuggestions(idx);
                        }}
                        onFocus={() => setShowSuggestions(idx)}
                        onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        placeholder="Name"
                        value={medicine.medicineName}
                      />
                      {showSuggestions === idx && medicine.medicineName.length > 0 && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-[#c8d7d1] rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                          {inventory
                            .filter(item => item.itemName.toLowerCase().includes(medicine.medicineName.toLowerCase()))
                            .map((item, sIdx) => (
                              <div
                                key={`sugg-${sIdx}`}
                                className="px-4 py-3 hover:bg-[#f4f8f6] cursor-pointer text-sm text-[#122c24] border-b border-gray-50 last:border-0"
                                onClick={() => {
                                  setForm((current) => {
                                    const next = [...current.medicines];
                                    next[idx] = { 
                                      ...next[idx], 
                                      medicineName: item.itemName,
                                      dosage: item.strengthComposition || next[idx].dosage
                                    };
                                    return { ...current, medicines: next };
                                  });
                                  setShowSuggestions(null);
                                }}
                              >
                                <div className="font-bold">{item.itemName}</div>
                                <div className="text-[10px] text-[#607d74] uppercase font-bold tracking-tight">
                                  {item.category} | {item.stockQuantity} {item.stockUnit} Left
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <input
                      className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 font-semibold"
                      onChange={handleMedicineChange(idx, 'dosage')}
                      placeholder="Dosage"
                      value={medicine.dosage}
                    />
                    <input
                      className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 font-semibold"
                      onChange={handleMedicineChange(idx, 'instruction')}
                      placeholder="Timing"
                      value={medicine.instruction}
                    />
                    <input
                      className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 font-bold"
                      type="number"
                      min="1"
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setForm((current) => {
                          const next = [...current.medicines];
                          next[idx] = { ...next[idx], quantity: val };
                          return { ...current, medicines: next };
                        });
                      }}
                      value={medicine.quantity}
                    />
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 self-center"
                      disabled={form.medicines.length === 1}
                      onClick={() => removeMedicineRow(idx)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#1faa62]/30 text-[#1faa62] font-bold text-sm hover:bg-[#1faa62]/5 transition-all"
                  onClick={addMedicineRow}
                  type="button"
                >
                  + Add Another Medicine
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#516c63] uppercase ml-1">Additional Instructions</label>
                <textarea
                  className="w-full rounded-xl border border-[#c8d7d1] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#1faa62]/10 min-h-[60px] font-medium"
                  onChange={handleFormChange('notes')}
                  placeholder="Any extra notes for the patient?"
                  value={form.notes}
                />
              </div>

              {formError ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3 text-red-700 text-sm font-semibold animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 pb-2">
                <button
                  className="px-6 py-2 rounded-xl border border-[#c8d7d1] text-sm font-bold text-[#27483d] hover:bg-[#f4f8f6] transition-all"
                  onClick={closeModal}
                  type="button"
                >
                  Discard
                </button>
                <button
                  className="px-6 py-2 rounded-xl bg-[#1faa62] text-sm font-bold text-white shadow-lg hover:shadow-green-200 hover:bg-[#179353] active:scale-95 transition-all disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Prescriptions;
