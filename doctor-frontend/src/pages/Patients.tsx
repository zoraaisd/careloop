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

  return (
    <div className="space-y-6 font-['Outfit']">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-black text-[#122c24] tracking-tight mb-2">Patient Records</h2>
          <p className="text-sm text-slate-500 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Manage and monitor your clinic's patient database
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group min-w-[320px]">
            <input
              className="w-full h-14 bg-white border border-slate-100 rounded-[20px] pl-14 pr-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:shadow-2xl focus:shadow-emerald-100/20 transition-all placeholder:text-slate-300 shadow-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, or condition..."
              type="text"
              value={search}
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </div>
          </div>
          <button
            className="h-14 px-8 bg-[#122c24] text-white rounded-[20px] text-sm font-black shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-3"
            onClick={openAddModal}
          >
            <Plus className="w-5 h-5" /> Register Patient
          </button>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white/50 backdrop-blur-xl rounded-[40px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Patient</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Primary Physician</th>
                <th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Contact</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Management</th>
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
                        <div>
                          <p className="text-sm font-bold text-[#122c24] leading-none mb-1">Dr. {patient.doctorName ? patient.doctorName.replace(/^(Dr\.\s*)+/gi, '') : 'Unassigned'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Consultant</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 whitespace-nowrap text-center">
                      <p className="text-sm font-bold text-[#122c24] mb-1">{patient.phone.replace(/^(\+91)(\d{10})$/, '$1 $2')}</p>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-widest">Verified</span>
                    </td>
                    <td className="px-10 py-7 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2 opactiy-0 group-hover:opacity-100 transition-opacity">
                        {[
                          { icon: MessageSquare, label: 'Chat', action: () => navigate(`/chat?patientId=${patient.patientId}`), color: 'text-blue-500', bg: 'bg-blue-50' },
                          { icon: Calendar, label: 'Schedule Visit', action: () => { setSelectedPatient(patient); setShowDirectBookModal(true); }, color: 'text-purple-500', bg: 'bg-purple-50' },
                          { icon: ClipboardList, label: 'Prescription', action: () => navigate(`/prescriptions?patientId=${patient.patientId}`), color: 'text-emerald-500', bg: 'bg-emerald-50' },
                          { icon: History, label: 'Direct Edit', action: () => { setSelectedPatient(patient); openEditModal(patient); setShowDetailModal(true); fetchProfileDocs(patient.patientId); }, color: 'text-slate-500', bg: 'bg-slate-50' },
                          { icon: AlertCircle, label: 'Delete', action: () => confirmDelete(patient), color: 'text-red-500', bg: 'bg-red-50' },
                        ].map((btn, i) => (
                          <button
                            key={i}
                            title={btn.label}
                            className={`w-10 h-10 rounded-2xl ${btn.bg} ${btn.color} flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm border border-white`}
                            onClick={(e) => { e.stopPropagation(); btn.action(); }}
                          >
                            <btn.icon className="w-5 h-5" />
                          </button>
                        ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-[800px] bg-white rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-full border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-[#122c24] tracking-tight">Register Patient</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">New Clinical Record</p>
              </div>
              <button className="p-3 hover:bg-slate-50 rounded-[20px] transition-all text-slate-400 hover:rotate-90" onClick={closeAddModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-10 pt-6">
              <form className="space-y-10" onSubmit={handleAddPatient}>
                <section className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <User className="w-4 h-4" />
                    </div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Personal Identification</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Patient Name *</label>
                    <input
                      className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                      onChange={handleFormChange('name')}
                      placeholder="e.g. Johnathan Doe"
                      value={form.name}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Contact *</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('phone')}
                        maxLength={10}
                        placeholder="Mobile Number"
                        value={form.phone}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Age (Years) *</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('age')}
                        placeholder="00"
                        value={form.age}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attending Physician</label>
                    <div className="relative">
                      <select
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none shadow-sm cursor-pointer"
                        onChange={handleFormChange('primaryDoctorId')}
                        value={form.primaryDoctorId}
                      >
                        <option value="">Auto-Assign / Select Doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.userId} value={doctor.userId}>{doctor.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Initial Vitals</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Body Weight (kg)</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('weight')}
                        placeholder="e.g. 72"
                        value={form.weight}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Height (cm)</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('height')}
                        placeholder="e.g. 178"
                        value={form.height}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Blood Pressure</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('bp')}
                        placeholder="120/80"
                        value={form.bp}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sugar Level</label>
                      <input
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        onChange={handleFormChange('sugar')}
                        placeholder="Fasting/Post-Prandial"
                        value={form.sugar}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-8 p-8 bg-slate-50/50 rounded-[40px] border border-slate-50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Clinical History</h4>
                  </div>

                  {/* Allergies */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Known Allergies (Multi-select)</label>
                    <div className="flex flex-wrap gap-2">
                      {allergiesOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleMultiSelect('allergies', opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${form.allergies.includes(opt)
                              ? 'bg-[#122c24] text-white border-[#122c24] shadow-lg shadow-slate-200'
                              : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.allergies.includes('Other') && (
                      <input
                        className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                        placeholder="Please specify other allergies..."
                        value={form.allergiesOther}
                        onChange={(e) => setForm(prev => ({ ...prev, allergiesOther: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Chronic Diseases */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chronic Diseases (Multi-select)</label>
                    <div className="flex flex-wrap gap-2">
                      {chronicDiseasesOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleMultiSelect('chronicDiseases', opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${form.chronicDiseases.includes(opt)
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                              : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.chronicDiseases.includes('Other') && (
                      <input
                        className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                        placeholder="Please specify other chronic diseases..."
                        value={form.chronicDiseasesOther}
                        onChange={(e) => setForm(prev => ({ ...prev, chronicDiseasesOther: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Past Surgeries */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Past Surgeries (Multi-select)</label>
                    <div className="flex flex-wrap gap-2">
                      {pastSurgeriesOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleMultiSelect('pastSurgeries', opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${form.pastSurgeries.includes(opt)
                              ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100'
                              : 'bg-white text-slate-500 border-slate-100 hover:border-purple-200'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.pastSurgeries.includes('Other') && (
                      <input
                        className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                        placeholder="Please specify other surgeries..."
                        value={form.pastSurgeriesOther}
                        onChange={(e) => setForm(prev => ({ ...prev, pastSurgeriesOther: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Previous Treatments */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Previous Treatments</label>
                    <div className="relative">
                      <select
                        className="w-full h-14 rounded-[20px] border border-slate-100 bg-white px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all appearance-none shadow-sm cursor-pointer"
                        value={form.previousTreatments}
                        onChange={(e) => setForm(prev => ({ ...prev, previousTreatments: e.target.value }))}
                      >
                        <option value="">Select Treatment Type</option>
                        {previousTreatmentsOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    {form.previousTreatments === 'Other' && (
                      <input
                        className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                        placeholder="Please specify other treatment..."
                        value={form.previousTreatmentsOther}
                        onChange={(e) => setForm(prev => ({ ...prev, previousTreatmentsOther: e.target.value }))}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" /> Additional Clinical Notes
                    </label>
                    <textarea
                      className="w-full rounded-[32px] border border-slate-100 bg-white p-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all min-h-[120px] shadow-sm leading-relaxed"
                      onChange={handleFormChange('healthProblem')}
                      placeholder="Specify medical complaints or other relevant details..."
                      value={form.healthProblem}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Preliminary Documents</label>
                    <div className="relative group">
                      <input
                        type="file"
                        id="reg-doc-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setForm(prev => ({ ...prev, docFile: file }));
                        }}
                      />
                      <label
                        htmlFor="reg-doc-upload"
                        className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[32px] cursor-pointer hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/20 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#122c24]">{form.docFile ? form.docFile.name : 'Upload Report'}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{form.docFile ? `${(form.docFile.size / 1024).toFixed(1)} KB` : 'PDF, JPEG or PNG'}</p>
                          </div>
                        </div>
                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">Browse</div>
                      </label>
                    </div>
                  </div>
                </section>

                {formError && (
                  <div className="p-5 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button className="flex-1 h-16 rounded-[24px] border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all" onClick={closeAddModal} type="button">Discard</button>
                  <button
                    className="flex-[2] h-16 rounded-[24px] bg-[#122c24] text-white text-sm font-black hover:bg-black shadow-[0_20px_40px_-12px_rgba(18,44,36,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                    {isSubmitting ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details & Edit Modals (using similar style) */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-[800px] bg-white rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-full border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {isEditingPatient ? (
                <div className="p-10 space-y-10 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-black text-[#122c24] tracking-tight">Modify Profile</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Patient ID: {selectedPatient.patientId.slice(-6).toUpperCase()}</p>
                    </div>
                    <button onClick={() => setIsEditingPatient(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all">
                      <X className="w-7 h-7" />
                    </button>
                  </div>

                  <div className="space-y-10">
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <User className="w-4 h-4" />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Identification</h4>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Patient Name</label>
                        <input
                          className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          value={editForm.name}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                            value={editForm.phone}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Age</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value.replace(/\D/g, '') }))}
                            value={editForm.age}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Activity className="w-4 h-4" />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Medical Metrics</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Weight (kg)</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                            value={editForm.weight}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Height (cm)</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                            value={editForm.height}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Blood Pressure</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, bp: e.target.value }))}
                            value={editForm.bp}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sugar Level</label>
                          <input
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            onChange={(e) => setEditForm(prev => ({ ...prev, sugar: e.target.value }))}
                            value={editForm.sugar}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-10 p-8 bg-slate-50/50 rounded-[40px] border border-white">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Clinical History</h4>
                      </div>

                      {/* Allergies */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Known Allergies (Multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                          {allergiesOptions.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleMultiSelect('allergies', opt, true)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${editForm.allergies.includes(opt)
                                  ? 'bg-[#122c24] text-white border-[#122c24] shadow-lg shadow-slate-200'
                                  : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {editForm.allergies.includes('Other') && (
                          <input
                            className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                            placeholder="Please specify other allergies..."
                            value={editForm.allergiesOther}
                            onChange={(e) => setEditForm(prev => ({ ...prev, allergiesOther: e.target.value }))}
                          />
                        )}
                      </div>

                      {/* Chronic Diseases */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chronic Diseases (Multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                          {chronicDiseasesOptions.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleMultiSelect('chronicDiseases', opt, true)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${editForm.chronicDiseases.includes(opt)
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                                  : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {editForm.chronicDiseases.includes('Other') && (
                          <input
                            className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                            placeholder="Please specify other chronic diseases..."
                            value={editForm.chronicDiseasesOther}
                            onChange={(e) => setEditForm(prev => ({ ...prev, chronicDiseasesOther: e.target.value }))}
                          />
                        )}
                      </div>

                      {/* Past Surgeries */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Past Surgeries (Multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                          {pastSurgeriesOptions.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleMultiSelect('pastSurgeries', opt, true)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${editForm.pastSurgeries.includes(opt)
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100'
                                  : 'bg-white text-slate-500 border-slate-100 hover:border-purple-200'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {editForm.pastSurgeries.includes('Other') && (
                          <input
                            className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                            placeholder="Please specify other surgeries..."
                            value={editForm.pastSurgeriesOther}
                            onChange={(e) => setEditForm(prev => ({ ...prev, pastSurgeriesOther: e.target.value }))}
                          />
                        )}
                      </div>

                      {/* Previous Treatments */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Previous Treatments</label>
                        <div className="relative">
                          <select
                            className="w-full h-14 rounded-[20px] border border-slate-100 bg-white px-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all appearance-none shadow-sm cursor-pointer"
                            value={editForm.previousTreatments}
                            onChange={(e) => setEditForm(prev => ({ ...prev, previousTreatments: e.target.value }))}
                          >
                            <option value="">Select Treatment Type</option>
                            {previousTreatmentsOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <Activity className="w-4 h-4" />
                          </div>
                        </div>
                        {editForm.previousTreatments === 'Other' && (
                          <input
                            className="w-full h-12 rounded-[16px] border border-slate-100 bg-white px-5 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all shadow-sm mt-2"
                            placeholder="Please specify other treatment..."
                            value={editForm.previousTreatmentsOther}
                            onChange={(e) => setEditForm(prev => ({ ...prev, previousTreatmentsOther: e.target.value }))}
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" /> Additional Clinical Notes
                        </label>
                        <textarea
                          className="w-full rounded-[32px] border border-slate-100 bg-white p-6 text-sm font-bold text-[#122c24] outline-none focus:border-emerald-500 transition-all min-h-[120px] shadow-sm leading-relaxed"
                          onChange={(e) => setEditForm(prev => ({ ...prev, healthProblem: e.target.value }))}
                          placeholder="Specify medical complaints or other relevant details..."
                          value={editForm.healthProblem}
                        />
                      </div>
                    </section>
                  </div>

                  <div className="pt-10 flex gap-4">
                    <button className="flex-1 h-16 rounded-[24px] border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setIsEditingPatient(false)}>Cancel Changes</button>
                    <button
                      className="flex-[2] h-16 rounded-[24px] bg-[#122c24] text-white text-sm font-black hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      disabled={isSubmitting}
                      onClick={() => void handleSavePatientChanges()}
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                      {isSubmitting ? 'Saving Changes...' : 'Update Records'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Header Banner */}
                  <div className="h-44 bg-gradient-to-br from-[#122c24] via-emerald-900 to-[#122c24] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.3),transparent_70%)]"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-3xl text-white transition-all hover:rotate-90 border border-white/10 z-10"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <div className="absolute -bottom-14 left-10 p-2 bg-white rounded-[40px] shadow-2xl z-10">
                      <div className="w-32 h-32 rounded-[34px] bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center text-6xl font-black text-emerald-600 border-4 border-emerald-50/50">
                        {selectedPatient.name.charAt(0)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-20 px-10 pb-10">
                    <div className="mb-10">
                      <h3 className="text-4xl font-black text-[#122c24] tracking-tight mb-3 leading-tight break-words">{selectedPatient.name}</h3>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> {selectedPatient.condition || 'General Patient'}
                        </span>
                        <span className="px-4 py-2 bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-slate-100 flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5" /> ID: {selectedPatient.patientId.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Vital Information Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                      {[
                        { label: 'Age', value: `${selectedPatient.age} Yrs`, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                        { label: 'Gender', value: selectedPatient.gender || 'N/A', icon: User, color: 'text-purple-600', bg: 'bg-purple-50/50' },
                        { label: 'Sugar', value: selectedPatient.sugar || 'N/A', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50/50' },
                      ].map((stat, i) => (
                        <div key={i} className={`p-4 rounded-[32px] ${stat.bg} border border-white flex flex-col items-center text-center shadow-sm`}>
                          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-2.5">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-sm font-black text-[#122c24]">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Health Metrics & Stats */}
                    <div className="space-y-4 mb-10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50/50 rounded-[40px] border border-white hover:bg-white hover:shadow-2xl hover:shadow-slate-100 transition-all group">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors border border-slate-50">
                              <Weight className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Body Metrics</span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Weight</p>
                              <p className="text-lg font-black text-[#122c24]">{selectedPatient.weight ? `${selectedPatient.weight} kg` : 'N/A'}</p>
                            </div>
                            <div className="w-full h-px bg-slate-100"></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Height</p>
                              <p className="text-lg font-black text-[#122c24]">{selectedPatient.height ? `${selectedPatient.height} cm` : 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 rounded-[40px] border border-white hover:bg-white hover:shadow-2xl hover:shadow-slate-100 transition-all group">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors border border-slate-50">
                              <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Vital Signs</span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">BP</p>
                              <p className="text-lg font-black text-[#122c24]">{selectedPatient.bp || 'N/A'}</p>
                            </div>
                            <div className="w-full h-px bg-slate-100"></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Sugar</p>
                              <p className="text-lg font-black text-[#122c24]">{selectedPatient.sugar || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Medical Summary Cards */}
                      <div className="p-8 bg-slate-50/50 rounded-[48px] border border-white space-y-8">
                        {[
                          { label: 'Health Issues', value: selectedPatient.healthProblem, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { label: 'Known Allergies', value: selectedPatient.allergies, icon: Droplets, color: 'text-red-500', bg: 'bg-red-50' },
                          { label: 'Chronic Diseases', value: selectedPatient.chronicDiseases, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                          { label: 'History & Surgeries', value: selectedPatient.pastSurgeries, icon: History, color: 'text-blue-500', bg: 'bg-blue-50' },
                        ].map((item, i) => (
                          <div key={i} className="flex gap-6 group">
                            <div className={`w-12 h-12 rounded-[20px] ${item.bg} flex flex-shrink-0 items-center justify-center ${item.color} shadow-sm border border-white group-hover:scale-110 transition-transform`}>
                              <item.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 border-b border-slate-100/50 pb-6 group-last:border-0 group-last:pb-0">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                              <p className="text-sm font-bold text-[#122c24] leading-relaxed break-all">{item.value || 'No specific records found.'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Management Section */}
                    <div className="mb-10">
                      <div className="flex items-center justify-between mb-6 px-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Medical Documentation</h4>
                          <span className="px-3 py-1 bg-[#122c24] text-white text-[10px] font-black rounded-xl shadow-lg shadow-slate-200">{profileDocs.length}</span>
                        </div>
                        {loadingDocs && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
                      </div>

                      {profileDocs.length === 0 && !loadingDocs ? (
                        <div className="p-12 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200 text-center">
                          <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center text-slate-200 mx-auto mb-5 shadow-sm">
                            <FileText className="w-10 h-10" />
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No documentation found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {profileDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="group flex items-center justify-between p-5 bg-slate-50/80 hover:bg-white border border-transparent hover:border-emerald-200 rounded-[36px] transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-100/50"
                              onClick={() => window.open(getDocumentUrl(doc.fileUrl || doc.url), '_blank', 'noopener,noreferrer')}
                            >
                              <div className="flex items-center gap-5 overflow-hidden">
                                <div className="w-14 h-14 rounded-[22px] bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-slate-50 group-hover:scale-110 transition-transform">
                                  <FileText className="w-7 h-7" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-black text-[#122c24] truncate mb-1.5">{doc.fileName || doc.name}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                                    <Calendar className="w-3.5 h-3.5" /> {new Date(doc.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(e, doc);
                                }}
                                className="p-4 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-[20px] transition-all"
                              >
                                <Download className="w-6 h-6" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsEditingPatient(true)}
                        className="flex-1 py-6 bg-[#122c24] text-white rounded-[32px] text-sm font-black shadow-[0_20px_40px_-12px_rgba(18,44,36,0.3)] hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <User className="w-5 h-5" /> Edit Patient Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && patientToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 text-center animate-in fade-in duration-300">
          <div className="w-full max-w-[420px] rounded-[48px] bg-white border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 animate-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-[36px] bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-8 shadow-sm">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-[#122c24] mb-3 tracking-tight">Delete Patient?</h3>
            <p className="text-sm text-slate-500 font-semibold mb-10 leading-relaxed px-4">
              You are about to permanently remove <span className="text-red-600 font-black">{patientToDelete.name}</span>. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button
                disabled={isSubmitting}
                onClick={handleDeletePatient}
                className="w-full py-5 rounded-[24px] bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : 'Yes, Delete Record'}
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-5 rounded-[24px] border border-slate-100 text-sm font-black text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancel & Keep
              </button>
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
