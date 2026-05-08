import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

type PatientRow = {
  patientId: string;
  name: string;
  doctorName: string | null;
  phone: string;
  age: number;
  email: string | null;
  bloodGroup: string | null;
  condition: string | null;
  notes: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
};

type PatientListResponse = {
  total: number;
  items: PatientRow[];
};

type DoctorOption = {
  userId: string;
  name: string;
};

type DoctorListItem = {
  userId: string;
  name: string;
};

type AddPatientForm = {
  name: string;
  phone: string;
  age: string;
  email: string;
  bloodGroup: string;
  condition: string;
  notes: string;
  primaryDoctorId: string;
};

const initialForm: AddPatientForm = {
  name: '',
  phone: '',
  age: '',
  email: '',
  bloodGroup: '',
  condition: '',
  notes: '',
  primaryDoctorId: '',
};

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AddPatientForm>(initialForm);
  const [formError, setFormError] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get<PatientListResponse>('/doctor/patients');
      setPatients(response.data.items ?? []);
    } catch (error) {
      console.error('Failed to fetch patients', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get<DoctorListItem[]>('/doctor/doctors');
      const options = (response.data ?? []).map((doctor) => ({
        userId: doctor.userId,
        name: doctor.name,
      }));
      setDoctors(options);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
      setDoctors([]);
    }
  };

  useEffect(() => {
    void fetchPatients();
    void fetchDoctors();
  }, []);

  const filteredPatients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return patients;

    return patients.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(keyword) ||
        (patient.doctorName ?? '').toLowerCase().includes(keyword) ||
        patient.phone.toLowerCase().includes(keyword)
      );
    });
  }, [patients, search]);

  const openAddModal = () => {
    setForm(initialForm);
    setFormError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (isSubmitting) return;
    setShowAddModal(false);
  };

  const handleFormChange =
    (field: keyof AddPatientForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let value = event.target.value;

      if (field === 'phone') {
        value = value.replace(/\D/g, '').slice(0, 10);
      }

      if (field === 'age') {
        value = value.replace(/\D/g, '');
      }

      setForm((current) => ({ ...current, [field]: value }));
      setFormError('');
    };

  const handleAddPatient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (!form.phone.trim()) {
      setFormError('Phone is required.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      setFormError('Phone number must be exactly 10 digits.');
      return;
    }

    if (!form.age.trim()) {
      setFormError('Age is required.');
      return;
    }

    const age = Number(form.age);
    if (!Number.isFinite(age) || age < 0 || age > 130) {
      setFormError('Age must be between 0 and 130.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/doctor/patients', {
        name: form.name.trim(),
        phone: `+91${form.phone.trim()}`,
        age,
        email: form.email.trim() || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        condition: form.condition.trim() || undefined,
        notes: form.notes.trim() || undefined,
        primaryDoctorId: form.primaryDoctorId || undefined,
      });

      setShowAddModal(false);
      await fetchPatients();
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(error.response?.data?.message ?? 'Failed to add patient.');
      } else {
        setFormError('Failed to add patient.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      await api.delete(`/doctor/patients/${patientId}`);
      await fetchPatients();
    } catch (error) {
      console.error('Failed to delete patient', error);
    }
  };

  const handleSendOtp = async (patientId: string) => {
    try {
      await api.post(`/doctor/patients/${patientId}/send-otp`);
      await fetchPatients();
    } catch (error) {
      console.error('Failed to send OTP', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <button
          className="px-4 py-2 bg-[#1faa62] hover:bg-[#199453] text-white font-semibold rounded-lg shadow-sm transition-colors text-sm shrink-0"
          onClick={openAddModal}
          type="button"
        >
          + Add Patient
        </button>
        <div className="flex-1 max-w-md">
          <input
            className="w-full px-4 py-2 border border-[#bfd0c8] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patients..."
            type="text"
            value={search}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfd0c8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#d7e2dd]">
            <thead className="bg-[#f4f8f6]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Patient No</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Verified</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#516c63] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e0e9e4]">
              {loading ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[#6e847c] text-sm" colSpan={7}>
                    Loading patients...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[#6e847c] text-sm" colSpan={7}>
                    No patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => (
                  <tr className="hover:bg-[#f8fbf9]" key={patient.patientId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1faa62]">
                      {`PAD${String(idx + 1).padStart(3, '0')}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-[#142e26]">{patient.name}</div>
                      <div className="text-xs text-[#738980]">{patient.condition || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{patient.doctorName ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{patient.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#17352d]">{patient.age}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.verificationStatus === 'verified' ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded text-green-700 bg-green-100">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded text-red-600 bg-red-100">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors"
                          onClick={() => void handleSendOtp(patient.patientId)}
                          type="button"
                        >
                          OTP
                        </button>
                        <button className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors" type="button">Edit</button>
                        <button className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors" type="button">Dashboard</button>
                        <button className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors" type="button">Docs</button>
                        <button className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors" type="button">Slots</button>
                        <button className="px-3 py-1 border border-[#c6d3ce] rounded text-[#28483e] hover:bg-[#f1f6f3] transition-colors" type="button">Chat</button>
                        <button
                          className="px-3 py-1 border border-red-300 rounded text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          onClick={() => void handleDeletePatient(patient.patientId)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
          <div className="w-full max-w-[520px] rounded-[14px] bg-white border border-[#c8d7d1] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d6e1dc] px-5 py-4">
              <h3 className="text-[26px] font-semibold text-[#122c24]">Add Patient</h3>
              <button
                className="text-[#607d74] hover:text-[#1a3b31] text-2xl leading-none"
                onClick={closeAddModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="px-5 py-4 space-y-3" onSubmit={handleAddPatient}>
              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                onChange={handleFormChange('name')}
                placeholder="Full Name *"
                value={form.name}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={handleFormChange('phone')}
                  maxLength={10}
                  placeholder="+91"
                  value={form.phone}
                />
                <input
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={handleFormChange('age')}
                  placeholder="Age"
                  value={form.age}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={handleFormChange('email')}
                  placeholder="Email"
                  value={form.email}
                />
                <select
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                  onChange={handleFormChange('bloodGroup')}
                  value={form.bloodGroup}
                >
                  <option value="">Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <select
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                onChange={handleFormChange('primaryDoctorId')}
                value={form.primaryDoctorId}
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.userId} value={doctor.userId}>
                    {doctor.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                onChange={handleFormChange('condition')}
                placeholder="Conditions (comma separated, e.g. Diabetes, Hypertension)"
                value={form.condition}
              />

              <textarea
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100 min-h-[72px]"
                onChange={handleFormChange('notes')}
                placeholder="Notes / Medical history"
                value={form.notes}
              />

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="mt-2 flex justify-end gap-3 border-t border-[#d6e1dc] pt-4">
                <button
                  className="rounded-lg border border-[#c8d7d1] px-5 py-2.5 text-sm font-semibold text-[#27483d] hover:bg-[#f4f8f6]"
                  onClick={closeAddModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-[#1faa62] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Adding...' : 'Add Patient & Send Welcome WA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Patients;
