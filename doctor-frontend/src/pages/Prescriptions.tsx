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

  useEffect(() => {
    void fetchPrescriptions();
    void fetchPatients();
    void fetchDoctors();
  }, []);

  const openModal = () => {
    setForm(initialForm);
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
      setForm((current) => ({ ...current, [field]: value }));
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

  return (
    <div className="space-y-4">
      <div>
        <button
          className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
          onClick={openModal}
          type="button"
        >
          + New Prescription
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfd0c8] overflow-hidden">
        <table className="min-w-full divide-y divide-[#d7e2dd]">
          <thead className="bg-[#f4f8f6]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Patient</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Doctor</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Diagnosis</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Medicines</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#e0e9e4]">
            {loading ? (
              <tr>
                <td className="px-6 py-8 text-center text-[#6e847c] text-sm" colSpan={6}>Loading prescriptions...</td>
              </tr>
            ) : prescriptions.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-[#6e847c] text-sm" colSpan={6}>No prescriptions yet.</td>
              </tr>
            ) : (
              prescriptions.map((row) => (
                <tr className="hover:bg-[#f8fbf9]" key={row.prescriptionId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{row.patientName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{row.doctorName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{row.diagnosis || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{row.medicinesSummary || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{row.prescriptionDate || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900" type="button">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
          <div className="w-full max-w-[860px] rounded-[14px] bg-white border border-[#c8d7d1] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d6e1dc] px-5 py-4">
              <h3 className="text-[30px] font-semibold text-[#122c24]">New Prescription</h3>
              <button className="text-[#607d74] hover:text-[#1a3b31] text-2xl leading-none" onClick={closeModal} type="button">
                ×
              </button>
            </div>

            <form className="px-5 py-4 space-y-3" onSubmit={handleCreatePrescription}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
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

                <select
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
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

              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                onChange={handleFormChange('diagnosis')}
                placeholder="Diagnosis / Reason *"
                value={form.diagnosis}
              />

              {form.medicines.map((medicine, idx) => (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2" key={`med-${idx}`}>
                  <input
                    className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                    onChange={handleMedicineChange(idx, 'medicineName')}
                    placeholder="Medicine Name"
                    value={medicine.medicineName}
                  />
                  <input
                    className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                    onChange={handleMedicineChange(idx, 'dosage')}
                    placeholder="Dosage (e.g. 500mg)"
                    value={medicine.dosage}
                  />
                  <input
                    className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                    onChange={handleMedicineChange(idx, 'instruction')}
                    placeholder="Timing"
                    value={medicine.instruction}
                  />
                  <button
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-500 text-sm disabled:opacity-40"
                    disabled={form.medicines.length === 1}
                    onClick={() => removeMedicineRow(idx)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                className="rounded-lg border border-[#77c796] bg-[#e9f8ef] px-3 py-1.5 text-sm font-semibold text-[#1c7b48] hover:bg-[#ddf4e6]"
                onClick={addMedicineRow}
                type="button"
              >
                + Add Medicine
              </button>

              <textarea
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 min-h-[72px]"
                onChange={handleFormChange('notes')}
                placeholder="Additional notes / Instructions"
                value={form.notes}
              />

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="mt-2 flex justify-end gap-3 border-t border-[#d6e1dc] pt-3">
                <button
                  className="rounded-lg border border-[#c8d7d1] px-5 py-2.5 text-sm font-semibold text-[#27483d] hover:bg-[#f4f8f6]"
                  onClick={closeModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-[#1faa62] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Send to Patient'}
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
