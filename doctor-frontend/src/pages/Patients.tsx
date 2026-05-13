import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';
import PatientDocumentsModal from '@/components/patients/PatientDocumentsModal';
import PatientSlotsModal from '@/components/patients/PatientSlotsModal';
import BookAppointmentModal from '@/components/appointments/BookAppointmentModal';
import { X, FileText, Plus, Loader2, AlertCircle, User, Activity, ClipboardList, Thermometer, Weight, History, Calendar, AlertTriangle, Droplets, MessageSquare, FileSpreadsheet, Download } from 'lucide-react';

type PatientRow = {
  patientId: string;
  primaryDoctorId?: string | null;
  name: string;
  doctorName: string | null;
  phone: string;
  age: number;
  email: string | null;
  bloodGroup: string | null;
  condition: string | null;
  notes: string | null;
  weight: string | null;
  height: string | null;
  bp: string | null;
  sugar: string | null;
  healthProblem: string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  pastSurgeries: string | null;
  previousTreatments: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  gender?: string | null;
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
  gender: string;
  weight: string;
  height: string;
  bp: string;
  sugar: string;
  healthProblem: string;
  allergies: string[];
  allergiesOther: string;
  chronicDiseases: string[];
  chronicDiseasesOther: string;
  pastSurgeries: string[];
  pastSurgeriesOther: string;
  previousTreatments: string;
  previousTreatmentsOther: string;
  primaryDoctorId: string;
  docName: string;
  docFile: File | null;
};

const initialForm: AddPatientForm = {
  name: '',
  phone: '',
  age: '',
  email: '',
  bloodGroup: '',
  condition: '',
  notes: '',
  gender: '',
  weight: '',
  height: '',
  bp: '',
  sugar: '',
  healthProblem: '',
  allergies: [],
  allergiesOther: '',
  chronicDiseases: [],
  chronicDiseasesOther: '',
  pastSurgeries: [],
  pastSurgeriesOther: '',
  previousTreatments: '',
  previousTreatmentsOther: '',
  primaryDoctorId: '',
  docName: '',
  docFile: null,
};

const allergiesOptions = [
  'Penicillin', 'Dust', 'Food Allergy', 'Skin Allergy',
  'Medicine Allergy', 'Pollen', 'Seafood', 'No Known Allergies', 'Other'
];

const chronicDiseasesOptions = [
  'Diabetes', 'Hypertension (BP)', 'Asthma', 'Thyroid',
  'Heart Disease', 'Kidney Disease', 'Arthritis', 'Migraine',
  'Epilepsy', 'No Chronic Disease', 'Other'
];

const pastSurgeriesOptions = [
  'Appendix Surgery', 'C-Section', 'Heart Surgery',
  'Orthopedic Surgery', 'Eye Surgery', 'No Surgery', 'Other'
];

const previousTreatmentsOptions = [
  'General Consultation', 'Diabetes Treatment', 'BP Treatment',
  'Physiotherapy', 'Skin Treatment', 'Cardiac Treatment',
  'Surgery Follow-Up', 'Other'
];

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [profileDocs, setProfileDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchProfileDocs = async (patientId: string) => {
    setLoadingDocs(true);
    try {
      const [sqlRes, waRes] = await Promise.allSettled([
        api.get(`/doctor/documents/${patientId}`),
        api.get(`/whatsapp/patients/${patientId}/documents`)
      ]);

      let allDocs: any[] = [];
      if (sqlRes.status === 'fulfilled') {
        allDocs = [...allDocs, ...sqlRes.value.data];
      }
      if (waRes.status === 'fulfilled') {
        allDocs = [...allDocs, ...(waRes.value.data || [])];
      }
      setProfileDocs(allDocs);
    } catch (err) {
      console.error('Failed to fetch profile docs', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const getDocumentUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${api.defaults.baseURL?.replace('/api', '')}${fileUrl}`;
  };

  const handleDownload = async (event: React.MouseEvent, doc: any) => {
    event.stopPropagation();
    try {
      const response = await fetch(getDocumentUrl(doc.fileUrl || doc.url));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.fileName || doc.name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      window.open(getDocumentUrl(doc.fileUrl || doc.url), '_blank', 'noopener,noreferrer');
    }
  };

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [showDirectBookModal, setShowDirectBookModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AddPatientForm>(initialForm);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<PatientRow | null>(null);
  const [formError, setFormError] = useState('');
  const [tableMessage, setTableMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editForm, setEditForm] = useState<AddPatientForm>(initialForm);

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

  const toggleMultiSelect = (field: 'allergies' | 'chronicDiseases' | 'pastSurgeries', value: string, isEdit: boolean = false) => {
    const setTargetForm = isEdit ? setEditForm : setForm;

    setTargetForm((prev: any) => {
      const currentValues = prev[field] || [];
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter((v: string) => v !== value) };
      } else {
        return { ...prev, [field]: [...currentValues, value] };
      }
    });
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
    setFormError('');

    const payload = {
      name: form.name.trim(),
      phone: `+91${form.phone.trim()}`,
      age,
      email: form.email.trim() || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      condition: form.condition.trim() || undefined,
      notes: form.notes.trim() || undefined,
      gender: form.gender.trim() || undefined,
      weight: form.weight.trim() || undefined,
      height: form.height.trim() || undefined,
      bp: form.bp.trim() || undefined,
      sugar: form.sugar.trim() || undefined,
      healthProblem: form.healthProblem.trim() || undefined,
      allergies: (form.allergies?.includes('Other') ? [...form.allergies.filter(a => a !== 'Other'), form.allergiesOther] : (form.allergies || [])).join(', '),
      chronicDiseases: (form.chronicDiseases?.includes('Other') ? [...form.chronicDiseases.filter(d => d !== 'Other'), form.chronicDiseasesOther] : (form.chronicDiseases || [])).join(', '),
      pastSurgeries: (form.pastSurgeries?.includes('Other') ? [...form.pastSurgeries.filter(s => s !== 'Other'), form.pastSurgeriesOther] : (form.pastSurgeries || [])).join(', '),
      previousTreatments: form.previousTreatments === 'Other' ? form.previousTreatmentsOther : form.previousTreatments,
      primaryDoctorId: form.primaryDoctorId || undefined,
    };

    console.log('Registering patient with payload:', payload);

    try {
      const response = await api.post('/doctor/patients', payload);

      const patientId = (response.data as { patientId: string }).patientId;

      // Handle document upload if file is selected
      if (form.docFile && patientId) {
        const formData = new FormData();
        formData.append('file', form.docFile);
        formData.append('patientId', patientId);
        // If docName is provided, we might want to handle it, but current API uses file name.
        // For now, just upload the file.
        await api.post('/doctor/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

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
    setIsEditingPatient(false);
    setShowDetailModal(true);
    fetchProfileDocs(patient.patientId);
  };

  const openEditModal = (patient: PatientRow) => {
    const phoneDigits = patient.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
    setEditForm({
      name: patient.name ?? '',
      phone: phoneDigits,
      age: String(patient.age ?? ''),
      email: patient.email ?? '',
      bloodGroup: patient.bloodGroup ?? '',
      condition: patient.condition ?? '',
      notes: patient.notes ?? '',
      gender: patient.gender ?? '',
      weight: patient.weight ?? '',
      height: patient.height ?? '',
      bp: patient.bp ?? '',
      sugar: patient.sugar ?? '',
      healthProblem: patient.healthProblem ?? '',
      allergies: (patient.allergies ?? '').split(', ').filter(Boolean),
      allergiesOther: '',
      chronicDiseases: (patient.chronicDiseases ?? '').split(', ').filter(Boolean),
      chronicDiseasesOther: '',
      pastSurgeries: (patient.pastSurgeries ?? '').split(', ').filter(Boolean),
      pastSurgeriesOther: '',
      previousTreatments: patient.previousTreatments ?? '',
      previousTreatmentsOther: '',
      primaryDoctorId: patient.primaryDoctorId ?? '',
      docName: '',
      docFile: null,
    });
    setFormError('');
    setIsEditingPatient(true);
  };

  const handleSavePatientChanges = async () => {
    if (!selectedPatient) return;

    if (!editForm.name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!editForm.phone.trim() || !/^\d{10}$/.test(editForm.phone.trim())) {
      setFormError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!editForm.age.trim()) {
      setFormError('Age is required.');
      return;
    }

    const age = Number(editForm.age);
    if (!Number.isFinite(age) || age < 0 || age > 130) {
      setFormError('Age must be between 0 and 130.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      name: editForm.name.trim(),
      phone: `+91${editForm.phone.trim()}`,
      age,
      email: editForm.email.trim() || null,
      bloodGroup: editForm.bloodGroup.trim() || null,
      condition: editForm.condition.trim() || null,
      notes: editForm.notes.trim() || null,
      gender: editForm.gender.trim() || null,
      weight: editForm.weight.trim() || null,
      height: editForm.height.trim() || null,
      bp: editForm.bp.trim() || null,
      sugar: editForm.sugar.trim() || null,
      healthProblem: editForm.healthProblem.trim() || null,
      allergies: (editForm.allergies?.includes('Other') ? [...editForm.allergies.filter(a => a !== 'Other'), editForm.allergiesOther] : (editForm.allergies || [])).join(', '),
      chronicDiseases: (editForm.chronicDiseases?.includes('Other') ? [...editForm.chronicDiseases.filter(d => d !== 'Other'), editForm.chronicDiseasesOther] : (editForm.chronicDiseases || [])).join(', '),
      pastSurgeries: (editForm.pastSurgeries?.includes('Other') ? [...editForm.pastSurgeries.filter(s => s !== 'Other'), editForm.pastSurgeriesOther] : (editForm.pastSurgeries || [])).join(', '),
      previousTreatments: editForm.previousTreatments === 'Other' ? editForm.previousTreatmentsOther : editForm.previousTreatments,
      primaryDoctorId: editForm.primaryDoctorId || null,
    };

    console.log('Updating patient with payload:', payload);

    try {
      await api.patch(`/doctor/patients/${selectedPatient.patientId}`, payload);

      await fetchPatients();
      setTableMessage({ type: 'success', text: 'Patient details updated successfully.' });
      setIsEditingPatient(false);
      setShowDetailModal(false);
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(error.response?.data?.message ?? 'Failed to update patient.');
      } else {
        setFormError('Failed to update patient.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (value: string) => value.replace(/^(\+91)(\d{10})$/, '$1 $2');

  const resolveDoctorName = (value: string | null) =>
    value ? `Dr. ${value.replace(/^(Dr\.\s*)+/gi, '')}` : 'Unassigned';

  const patientCountLabel = `${filteredPatients.length} ${filteredPatients.length === 1 ? 'patient' : 'patients'}`;

  return (
    <div className="space-y-5 font-['Outfit'] lg:space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col lg:items-start lg:justify-start">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Patient registry</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{loading ? 'Syncing records...' : patientCountLabel}</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1faa62] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition-all active:scale-95 hover:bg-[#179353] sm:w-auto"
            onClick={openAddModal}
            type="button"
          >
            <Plus className="w-5 h-5" /> Add Patient
          </button>
        </div>
        
        <div className="relative w-full lg:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#1faa62] transition-all text-sm font-semibold text-[#122c24] placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, doctor or phone..."
            type="text"
            value={search}
          />
        </div>
      </div>

      {/* Patient Table */}
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
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
            <tbody className="divide-y divide-slate-50/50">
              {loading ? (
                <tr>
                  <td className="px-10 py-32 text-center" colSpan={4}>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing secure database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td className="px-10 py-32 text-center" colSpan={4}>
                    <div className="max-w-[240px] mx-auto opacity-40">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm text-slate-500 font-bold">No patient matching your search criteria was found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                    key={patient.patientId}
                    onClick={() => openDetailModal(patient)}
                  >
                    <td className="px-10 py-7 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[22px] bg-emerald-50 border border-emerald-100 flex flex-shrink-0 items-center justify-center text-xl font-black text-emerald-600 group-hover:scale-110 transition-transform">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            className="text-base font-black text-[#122c24] hover:text-emerald-600 transition-colors block text-left leading-tight mb-1"
                            onClick={() => openDetailModal(patient)}
                          >
                            {patient.name}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">ID: {patient.patientId.slice(-6).toUpperCase()}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{patient.age} Yrs</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[12px] font-black text-slate-400 group-hover:border-emerald-200 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-[#122c24]">{resolveDoctorName(patient.doctorName)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="text-sm font-bold text-[#122c24]">{formatPhoneNumber(patient.phone)}</span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-center text-sm font-bold text-[#122c24]">
                      {patient.age}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2.5 max-xl:flex-wrap" onClick={(event) => event.stopPropagation()}>
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

        <div className="space-y-3 p-3 sm:p-4 lg:hidden">
          {loading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Syncing Records...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <p className="text-sm font-bold text-slate-400">No patients found</p>
            </div>
          ) : (
            filteredPatients.map((patient, idx) => (
              <article key={patient.patientId} className="rounded-[26px] border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100/70 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                      #{String(idx + 1).padStart(3, '0')}
                    </span>
                    <button
                      className="mt-3 block text-left text-base font-black tracking-tight text-[#122c24] transition-colors hover:text-emerald-600"
                      onClick={() => openDetailModal(patient)}
                      type="button"
                    >
                      {patient.name}
                    </button>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {patient.condition || 'GENERAL VISIT'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Age</p>
                    <p className="mt-1 text-lg font-black text-[#122c24]">{patient.age}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-3xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Primary Doctor</p>
                    <p className="mt-1 text-sm font-bold text-[#122c24]">{resolveDoctorName(patient.doctorName)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Contact</p>
                    <p className="mt-1 text-sm font-bold text-[#122c24] break-all">{formatPhoneNumber(patient.phone)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowDocsModal(true);
                    }}
                    type="button"
                  >
                    Docs
                  </button>
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowSlotsModal(true);
                    }}
                    type="button"
                  >
                    Slots
                  </button>
                  <button
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 sm:col-span-1"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowPrescriptionModal(true);
                    }}
                    type="button"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Prescription
                  </button>
                  <button
                    className="rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                    onClick={() => navigate(`/chat?patientId=${patient.patientId}`)}
                    type="button"
                  >
                    Chat
                  </button>
                  <button
                    className="rounded-2xl bg-red-50 px-3 py-3 text-xs font-black text-red-600 shadow-sm transition hover:bg-red-100"
                    onClick={() => confirmDelete(patient)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
      {tableMessage && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold border ${tableMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-red-50 text-red-700 border-red-100'
            }`}
        >
          {tableMessage.text}
        </div>
      )}

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white bg-white shadow-2xl sm:rounded-[40px]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
              <div>
                <h3 className="text-2xl font-black text-[#122c24] sm:text-3xl">Register Patient</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 sm:text-base">Add a new record to your clinic database</p>
              </div>
              <button className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100" onClick={closeAddModal} type="button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="max-h-[calc(92vh-96px)] space-y-4 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6" onSubmit={handleAddPatient}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name *</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  onChange={handleFormChange('name')}
                  placeholder="Enter full name"
                  value={form.name}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number *</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    onChange={handleFormChange('phone')}
                    maxLength={10}
                    placeholder="+91"
                    value={form.phone}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Age *</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    onChange={handleFormChange('age')}
                    placeholder="Enter age"
                    value={form.age}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assign Primary Doctor</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
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

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:gap-4">
                <button className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all" onClick={closeAddModal} type="button">Cancel</button>
                <button className="flex-1 rounded-2xl bg-[#1faa62] py-3 text-sm font-black text-white hover:bg-[#179353] shadow-lg shadow-emerald-100 transition-all active:scale-95" disabled={isSubmitting} type="submit">{isSubmitting ? 'Registering...' : 'Register Patient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Edit Modals (using similar style) */}
      {showDetailModal && selectedPatient && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white bg-white shadow-2xl sm:rounded-[32px]">
               <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
               <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="w-24 h-24 rounded-[32px] bg-emerald-50 flex items-center justify-center text-4xl font-black text-emerald-600">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-50" type="button">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               {isEditingPatient ? (
                 <div className="space-y-4">
                   <h3 className="text-xl font-black text-[#122c24]">Edit Patient</h3>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name *</label>
                     <input
                       className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                       onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                       value={editForm.name}
                     />
                   </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone *</label>
                       <input
                         className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                         onChange={(event) => {
                           const value = event.target.value.replace(/\D/g, '').slice(0, 10);
                           setEditForm((current) => ({ ...current, phone: value }));
                         }}
                         value={editForm.phone}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Age *</label>
                       <input
                         className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                         onChange={(event) => {
                           const value = event.target.value.replace(/\D/g, '');
                           setEditForm((current) => ({ ...current, age: value }));
                         }}
                         value={editForm.age}
                       />
                     </div>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assign Primary Doctor</label>
                     <select
                       className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                       onChange={(event) =>
                         setEditForm((current) => ({ ...current, primaryDoctorId: event.target.value }))
                       }
                       value={editForm.primaryDoctorId}
                     >
                       <option value="">Select Doctor</option>
                       {doctors.map((doctor) => (
                         <option key={doctor.userId} value={doctor.userId}>{doctor.name}</option>
                       ))}
                     </select>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Condition</label>
                     <input
                       className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all"
                       onChange={(event) => setEditForm((current) => ({ ...current, condition: event.target.value }))}
                       value={editForm.condition}
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notes</label>
                     <textarea
                       className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e293b] outline-none focus:border-emerald-500 focus:bg-white transition-all min-h-20"
                       onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                       value={editForm.notes}
                     />
                   </div>
                   {formError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">{formError}</div>}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                     <button
                       className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all"
                       onClick={() => setIsEditingPatient(false)}
                       type="button"
                     >
                       Cancel
                     </button>
                     <button
                       className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-60"
                       disabled={isSubmitting}
                       onClick={() => void handleSavePatientChanges()}
                       type="button"
                     >
                       {isSubmitting ? 'Saving...' : 'Save Changes'}
                     </button>
                   </div>
                 </div>
               ) : (
                 <>
                    <h3 className="mb-1 text-2xl font-black text-[#122c24] sm:text-3xl">{selectedPatient.name}</h3>
                    <p className="mb-8 text-sm font-black uppercase tracking-widest text-emerald-600 sm:mb-10">{selectedPatient.condition || 'General Patient'}</p>
                    
                    <div className="mb-8 grid grid-cols-1 gap-5 rounded-[28px] bg-slate-50/70 p-5 sm:mb-10 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8">
                       <div>
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Phone</p>
                         <p className="text-sm font-black text-[#122c24]">{formatPhoneNumber(selectedPatient.phone)}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Age</p>
                        <p className="text-sm font-black text-[#122c24]">{selectedPatient.age} Years</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">Primary Doctor</p>
                        <p className="text-sm font-black text-[#122c24]">{resolveDoctorName(selectedPatient.doctorName)}</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">Email</p>
                        <p className="text-sm font-black text-[#122c24]">{selectedPatient.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">Blood Group</p>
                        <p className="text-sm font-black text-[#122c24]">{selectedPatient.bloodGroup || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">Verification</p>
                        <p className="text-sm font-black capitalize text-[#122c24]">{selectedPatient.verificationStatus}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">Notes</p>
                        <p className="text-sm font-black leading-relaxed text-[#122c24]">{selectedPatient.notes || 'No notes added.'}</p>
                      </div>
                   </div>

                    <button 
                      onClick={() => openEditModal(selectedPatient)}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                      type="button"
                    >
                      Edit Profile
                    </button>
                  </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 text-center backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white bg-white p-6 shadow-2xl sm:rounded-[40px] sm:p-10">
             <div className="w-20 h-20 rounded-[32px] bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-[#122c24] mb-3">Delete Patient?</h3>
             <p className="text-sm text-slate-500 font-semibold mb-10">This will permanently remove <span className="text-[#122c24] font-black">{patientToDelete.name}</span> from the database.</p>
             <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
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
      {showDirectBookModal && selectedPatient && (
        <BookAppointmentModal 
          isOpen={showDirectBookModal} 
          onClose={() => setShowDirectBookModal(false)} 
          initialPatientId={selectedPatient.patientId}
          onSuccess={() => {
            setShowDirectBookModal(false);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
};

export default Patients;
