import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { notifySuccess } from '@/services/api';
import PrescriptionFormModal from '@/components/prescriptions/PrescriptionFormModal';

const toAbsoluteFileUrl = (fileUrl: string) => {
  if (/^(data:|https?:\/\/)/i.test(fileUrl)) {
    return fileUrl;
  }

  const apiBaseUrl = api.defaults.baseURL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}${fileUrl}`;
};

type PrescriptionRow = {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  medicines?: {
    medicineName: string;
    dosage: string;
    instruction: string;
  }[];
  instructionsSummary?: string;
  notes?: string;
  pdfUrl?: string | null;
  sentAt?: string | null;
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

type PrescriptionPreview = {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  prescriptionDate: string;
  notes: string;
  pdfUrl?: string | null;
  medicines: MedicineForm[];
};

const formatPrescriptionDate = (value?: string) => {
  if (!value) {
    return new Date().toLocaleDateString('en-GB');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const Prescriptions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdFromQuery = searchParams.get('patientId');
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [previewPrescription, setPreviewPrescription] = useState<PrescriptionPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isSendingPdf, setIsSendingPdf] = useState(false);

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

  useEffect(() => {
    if (patientIdFromQuery && patients.length > 0 && doctors.length > 0) {
      const selected = patients.find(p => p.patientId === patientIdFromQuery);
      if (selected) {
        setShowModal(true);
        // Clear param so it doesn't reopen on refresh/back
        setSearchParams({}, { replace: true });
      }
    }
  }, [patientIdFromQuery, patients, doctors]);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const closePreview = () => {
    if (isSendingPdf) return;
    setPreviewPrescription(null);
    setPreviewError('');
  };

  const handlePrescriptionSuccess = (prescriptionId: string, form: any) => {
    const selectedPatientOption = patients.find((patient) => patient.patientId === form.patientId);
    const selectedDoctorOption = doctors.find((doctor) => doctor.userId === form.doctorId);

    setPreviewPrescription({
      prescriptionId: prescriptionId,
      patientId: form.patientId,
      doctorId: form.doctorId,
      patientName: selectedPatientOption?.name ?? 'Patient',
      doctorName: selectedDoctorOption?.name ?? 'Doctor',
      diagnosis: form.diagnosis.trim(),
      prescriptionDate: formatPrescriptionDate(),
      notes: form.notes.trim(),
      medicines: form.medicines.map((item: MedicineForm) => ({
        ...item,
        medicineName: item.medicineName.trim(),
        dosage: item.dosage.trim(),
        instruction: item.instruction.trim(),
      })),
    });

    void fetchPrescriptions();
  };

  const handleEditPreview = () => {
    setPreviewError('');
    setPreviewPrescription(null);
    setShowModal(true);
  };

  const handleSendPrescriptionPdf = async () => {
    if (!previewPrescription?.prescriptionId) return;

    setIsSendingPdf(true);
    setPreviewError('');
    try {
      const response = await api.post<{ message: string; pdfUrl: string }>(
        `/doctor/prescriptions/${previewPrescription.prescriptionId}/send-pdf`,
      );

      setPreviewPrescription((current: PrescriptionPreview | null) =>
        current
          ? {
              ...current,
              pdfUrl: response.data.pdfUrl,
            }
          : current,
      );

      if (response.data.pdfUrl && typeof window !== 'undefined') {
        window.open(toAbsoluteFileUrl(response.data.pdfUrl), '_blank', 'noopener,noreferrer');
      }
      notifySuccess('Prescription PDF sent successfully.');
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setPreviewError(error.response?.data?.message ?? 'Failed to send prescription PDF.');
      } else {
        setPreviewError('Failed to send prescription PDF.');
      }
    } finally {
      setIsSendingPdf(false);
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
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="w-full rounded-xl bg-[#1faa62] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 hover:bg-[#199453] sm:w-auto"
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
                className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-[#d6e1dc] bg-white p-5 shadow-sm transition-all hover:border-[#1faa62]/30 hover:shadow-lg sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#f0f9f4] flex-shrink-0 flex items-center justify-center text-[#1faa62] font-bold text-2xl border border-[#1faa62]/10 group-hover:scale-110 transition-transform">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-grow">
                  <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <>
          <div className="space-y-3 lg:hidden">
            {filteredPrescriptions.length === 0 ? (
              <div className="rounded-3xl border border-[#bfd0c8] bg-white px-4 py-8 text-center text-sm text-[#6e847c] shadow-sm">
                No prescriptions found for this patient.
              </div>
            ) : (
              filteredPrescriptions.map((row) => (
                <div key={row.prescriptionId} className="rounded-3xl border border-[#bfd0c8] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-[#17352d]">{row.doctorName || 'N/A'}</p>
                      <p className="mt-1 text-sm font-bold text-[#1faa62]">{row.prescriptionDate || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                      {row.diagnosis || 'N/A'}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-xl bg-[#f8fbf9] px-3 py-2 text-[#455c54]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#516c63]">Medicines</p>
                      <p className="mt-1 font-medium">{row.medicinesSummary || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fbf9] px-3 py-2 text-[#1faa62]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#516c63]">Instructions</p>
                      <p className="mt-1 font-bold italic">{(row as any).instructionsSummary || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-[32px] border border-[#bfd0c8] bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
            <table className="min-w-[960px] divide-y divide-[#d7e2dd]">
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
          </div>
        </>
      )}      <PrescriptionFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSuccess={handlePrescriptionSuccess}
        initialPatientId={patientIdFromQuery || selectedPatient?.id}
      />

      {previewPrescription ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4 py-6">
          <div className="flex max-h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-[30px] border border-[#c8d7d1] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d6e1dc] px-8 py-5">
              <div>
                <h3 className="text-2xl font-bold text-[#122c24]">Prescription PDF Preview</h3>
                <p className="mt-1 text-sm font-medium text-[#6e847c]">
                  Saved prescription details ready to review, edit, or send.
                </p>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#607d74] transition-all hover:bg-gray-100"
                onClick={closePreview}
                type="button"
              >
                <span className="text-xl leading-none">x</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#eef4f1] px-6 py-6">
              <div className="mx-auto w-full max-w-[840px] rounded-[28px] border border-[#dbe7e1] bg-white p-8 shadow-[0_20px_60px_rgba(17,44,36,0.08)]">
                <div className="flex flex-col gap-6 border-b border-[#dce7e2] pb-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#1faa62]">CareLoop Prescription</p>
                    <h4 className="mt-3 text-3xl font-bold text-[#122c24]">Medical Prescription</h4>
                    <p className="mt-2 text-sm font-medium text-[#6b8179]">
                      Prescription ID: <span className="font-bold text-[#17352d]">{previewPrescription.prescriptionId.slice(0, 8).toUpperCase()}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f5faf7] px-5 py-4 text-sm text-[#27483d]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6e847c]">Date</p>
                    <p className="mt-2 text-lg font-bold text-[#17352d]">{previewPrescription.prescriptionDate}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#dfe9e4] bg-[#fbfdfc] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6e847c]">Patient</p>
                    <p className="mt-2 text-xl font-bold text-[#122c24]">{previewPrescription.patientName}</p>
                    <p className="mt-1 text-sm font-medium text-[#6e847c]">Patient ID: {previewPrescription.patientId.slice(0, 8)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#dfe9e4] bg-[#fbfdfc] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6e847c]">Doctor</p>
                    <p className="mt-2 text-xl font-bold text-[#122c24]">{previewPrescription.doctorName}</p>
                    <p className="mt-1 text-sm font-medium text-[#6e847c]">Doctor ID: {previewPrescription.doctorId.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#dfe9e4] bg-[#fbfdfc] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6e847c]">Diagnosis</p>
                  <p className="mt-2 text-lg font-bold text-[#122c24]">{previewPrescription.diagnosis}</p>
                </div>

                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-bold uppercase tracking-[0.22em] text-[#516c63]">Medicines</h5>
                    <span className="rounded-full bg-[#f0f8f4] px-3 py-1 text-xs font-bold text-[#1faa62]">
                      {previewPrescription.medicines.length} Item{previewPrescription.medicines.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-[22px] border border-[#dbe6e1]">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.8fr)_110px] bg-[#f7fbf9]">
                      {['Medicine', 'Dosage', 'Timing', 'Days'].map((label) => (
                        <div key={label} className="px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#516c63]">
                          {label}
                        </div>
                      ))}
                    </div>
                    {previewPrescription.medicines.map((medicine: MedicineForm, index: number) => (
                      <div
                        key={`${previewPrescription.prescriptionId}-${medicine.medicineName}-${index}`}
                        className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.8fr)_110px] border-t border-[#e3ece7] bg-white"
                      >
                        <div className="px-4 py-4 text-sm font-bold text-[#17352d]">{medicine.medicineName}</div>
                        <div className="px-4 py-4 text-sm font-semibold text-[#39574d]">{medicine.dosage}</div>
                        <div className="px-4 py-4 text-sm font-medium text-[#516c63]">{medicine.instruction}</div>
                        <div className="px-4 py-4 text-sm font-bold text-[#17352d]">{medicine.quantity} Day{medicine.quantity > 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[#dfe9e4] bg-[#fbfdfc] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6e847c]">Additional Instructions</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-[#39574d]">
                    {previewPrescription.notes || 'No additional instructions added.'}
                  </p>
                </div>

                {previewPrescription.pdfUrl ? (
                  <div className="mt-6 rounded-2xl border border-[#cfe5d8] bg-[#eef8f2] px-4 py-3 text-sm font-semibold text-[#197948]">
                    PDF generated and opened successfully.
                  </div>
                ) : null}

                {previewError ? (
                  <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {previewError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#d6e1dc] bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                className="min-w-[140px] rounded-2xl border border-[#c8d7d1] px-6 py-3 text-sm font-bold text-[#27483d] transition-all hover:bg-[#f4f8f6]"
                onClick={handleEditPreview}
                type="button"
              >
                Edit
              </button>
              <button
                className="min-w-[180px] rounded-2xl bg-[#1faa62] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#179353] disabled:opacity-60"
                disabled={isSendingPdf}
                onClick={handleSendPrescriptionPdf}
                type="button"
              >
                {isSendingPdf ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Prescriptions;


