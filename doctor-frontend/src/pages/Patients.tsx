import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';
import PatientDocumentsModal from '@/components/patients/PatientDocumentsModal';
import PatientSlotsModal from '@/components/patients/PatientSlotsModal';
import PatientPrescriptionModal from '@/components/patients/PatientPrescriptionModal';
import { X, Plus, AlertCircle, FileSpreadsheet } from 'lucide-react';

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

type PatientListPayload =
  | PatientListResponse
  | PatientRow[]
  | { data?: PatientListResponse | PatientRow[] };

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
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AddPatientForm>(initialForm);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<PatientRow | null>(null);
  const [formError, setFormError] = useState('');
  const [tableMessage, setTableMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get<PatientListPayload>('/doctor/patients');
      const payload = response.data;
      const resolvedPayload =
        Array.isArray(payload) || (payload && 'items' in payload)
          ? payload
          : payload?.data;
      const items = Array.isArray(resolvedPayload)
        ? resolvedPayload
        : resolvedPayload?.items ?? [];
      setPatients(items);
      setTableMessage(null);
    } catch (error) {
      console.error('Failed to fetch patients', error);
      setPatients([]);
      setTableMessage({ type: 'error', text: 'Failed to load patients. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get<DoctorListItem[] | { data?: DoctorListItem[] }>('/doctor/doctors');
      const doctorItems = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
      const options = (doctorItems ?? []).map((doctor) => ({
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
      emitDashboardRefresh('patients:add');
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

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsSubmitting(true);
    try {
      const deletingPatientId = patientToDelete.patientId;
      const deletingPatientName = patientToDelete.name;
      await api.delete(`/doctor/patients/${deletingPatientId}`);
      setPatients((current) => current.filter((patient) => patient.patientId !== deletingPatientId));
      setShowDeleteModal(false);
      setPatientToDelete(null);
      setTableMessage({ type: 'success', text: `Patient deleted successfully: ${deletingPatientName}` });
      emitDashboardRefresh('patients:delete');
    } catch (error) {
      console.error('Failed to delete patient', error);
      setTableMessage({ type: 'error', text: 'Failed to delete patient. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (patient: PatientRow) => {
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  };

  const openDetailModal = (patient: PatientRow) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
  };

  const openEditModal = (patient: PatientRow) => {
    // const phoneDigits = patient.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
    setSelectedPatient(patient);
    /* setEditForm({
      name: patient.name ?? '',
      phone: phoneDigits,
      age: String(patient.age ?? ''),
      email: patient.email ?? '',
      bloodGroup: patient.bloodGroup ?? '',
      condition: patient.condition ?? '',
      notes: patient.notes ?? '',
      primaryDoctorId: '',
    }); */
    setFormError('');
    // setShowEditModal(true); // Feature not yet rendered
    alert('Edit feature coming soon or render the modal');
  };

  return (
    <div className="space-y-6 font-['Outfit']">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            className="px-6 py-3 bg-[#1faa62] hover:bg-[#179353] text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 transition-all text-sm flex items-center gap-2 active:scale-95"
            onClick={openAddModal}
            type="button"
          >
            <Plus className="w-5 h-5" /> Add Patient
          </button>
        </div>
        
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#1faa62] transition-all text-sm font-semibold text-[#122c24] placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone or ID..."
            type="text"
            value={search}
          />
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Doctor</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Age</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr>
                  <td className="px-8 py-20 text-center" colSpan={6}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td className="px-8 py-20 text-center" colSpan={6}>
                    <p className="text-slate-400 font-bold">No patients found</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => (
                  <tr
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    key={patient.patientId}
                    onClick={() => openDetailModal(patient)}
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                        #{String(idx + 1).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="text-sm font-black text-[#122c24] group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{patient.name}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{patient.condition || 'GENERAL VISIT'}</div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400">
                          {patient.doctorName?.charAt(0) || 'D'}
                        </div>
                        <span className="text-sm font-bold text-[#122c24]">Dr. {patient.doctorName ?? 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="text-sm font-bold text-[#122c24]">{patient.phone}</span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-center text-sm font-bold text-[#122c24]">
                      {patient.age}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2.5" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="px-5 py-1.5 border border-slate-200 rounded-full text-xs font-black text-slate-500 hover:bg-slate-50 transition-all shadow-sm bg-white"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowDocsModal(true);
                          }}
                          type="button"
                        >
                          Docs
                        </button>
                        <button 
                          className="px-5 py-1.5 border border-slate-200 rounded-full text-xs font-black text-slate-500 hover:bg-slate-50 transition-all shadow-sm bg-white" 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowSlotsModal(true);
                          }}
                          type="button"
                        >
                          Slots
                        </button>
                        <button 
                          className="px-5 py-1.5 border border-emerald-100 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-1.5" 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowPrescriptionModal(true);
                          }}
                          type="button"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Prescription
                        </button>
                        <button 
                          className="px-5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black hover:bg-emerald-100 transition-all shadow-sm" 
                          onClick={() => navigate(`/chat?patientId=${patient.patientId}`)}
                          type="button"
                        >
                          Chat
                        </button>
                        <button
                          className="px-5 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black hover:bg-red-100 transition-all shadow-sm"
                          onClick={() => confirmDelete(patient)}
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
      {tableMessage && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold border ${
            tableMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}
        >
          {tableMessage.text}
        </div>
      )}

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-[560px] rounded-[40px] bg-white border border-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-10 py-8">
              <div>
                <h3 className="text-3xl font-black text-[#122c24]">Register Patient</h3>
                <p className="text-base text-slate-500 font-semibold mt-1">Add a new record to your clinic database</p>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400" onClick={closeAddModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="px-10 py-8 space-y-5" onSubmit={handleAddPatient}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name *</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  onChange={handleFormChange('name')}
                  placeholder="Enter full name"
                  value={form.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number *</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    onChange={handleFormChange('phone')}
                    maxLength={10}
                    placeholder="+91"
                    value={form.phone}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Age *</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    onChange={handleFormChange('age')}
                    placeholder="Enter age"
                    value={form.age}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assign Primary Doctor</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                  onChange={handleFormChange('primaryDoctorId')}
                  value={form.primaryDoctorId}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.userId} value={doctor.userId}>{doctor.name}</option>
                  ))}
                </select>
              </div>

              {formError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">{formError}</div>}

              <div className="pt-4 flex gap-4">
                <button className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all" onClick={closeAddModal} type="button">Cancel</button>
                <button className="flex-[2] rounded-2xl bg-[#1faa62] py-4 text-sm font-black text-white hover:bg-[#179353] shadow-lg shadow-emerald-100 transition-all active:scale-95" disabled={isSubmitting} type="submit">{isSubmitting ? 'Registering...' : 'Register Patient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Edit Modals (using similar style) */}
      {showDetailModal && selectedPatient && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-[500px] rounded-[40px] bg-white border border-white shadow-2xl overflow-hidden p-10">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-24 h-24 rounded-[32px] bg-emerald-50 flex items-center justify-center text-4xl font-black text-emerald-600">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               <h3 className="text-3xl font-black text-[#122c24] mb-1">{selectedPatient.name}</h3>
               <p className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-10">{selectedPatient.condition || 'General Patient'}</p>
               
               <div className="grid grid-cols-2 gap-y-8 gap-x-6 mb-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Phone</p>
                    <p className="text-sm font-black text-[#122c24]">{selectedPatient.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Age</p>
                    <p className="text-sm font-black text-[#122c24]">{selectedPatient.age} Years</p>
                  </div>
               </div>

               <button 
                 onClick={() => { setShowDetailModal(false); openEditModal(selectedPatient); }}
                 className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
               >
                 Edit Profile
               </button>
            </div>
         </div>
      )}

      {showDeleteModal && patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 text-center">
          <div className="w-full max-w-[420px] rounded-[40px] bg-white border border-white shadow-2xl p-10">
             <div className="w-20 h-20 rounded-[32px] bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-[#122c24] mb-3">Delete Patient?</h3>
             <p className="text-sm text-slate-500 font-semibold mb-10">This will permanently remove <span className="text-[#122c24] font-black">{patientToDelete.name}</span> from the database.</p>
             <div className="flex gap-4">
                <button disabled={isSubmitting} onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 rounded-[20px] border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                <button disabled={isSubmitting} onClick={handleDeletePatient} className="flex-1 py-4 rounded-[20px] bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? 'Deleting...' : 'Delete'}</button>
             </div>
          </div>
        </div>
      )}

      {showDocsModal && selectedPatient && (
        <PatientDocumentsModal patient={selectedPatient} onClose={() => setShowDocsModal(false)} />
      )}
      {showSlotsModal && selectedPatient && (
        <PatientSlotsModal patient={selectedPatient} onClose={() => setShowSlotsModal(false)} />
      )}
      {showPrescriptionModal && selectedPatient && (
        <PatientPrescriptionModal patient={selectedPatient} onClose={() => setShowPrescriptionModal(false)} />
      )}
    </div>
  );
};

export default Patients;
