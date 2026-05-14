import React from 'react';
import { Download, FileText, Stethoscope, X } from 'lucide-react';

import type { PatientHistory } from '../types';
import { formatDateTime, getStatusPill } from '../utils';

type PatientHistoryPanelProps = {
  history: PatientHistory | null;
  loading: boolean;
  error: string | null;
  canClose: boolean;
  downloading: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
};

const PatientHistoryPanel: React.FC<PatientHistoryPanelProps> = ({
  history,
  loading,
  error,
  canClose,
  downloading,
  onClose,
  onDownloadPdf,
}) => {
  if (!history && !loading && !error) {
    return null;
  }

  const historySections = history
    ? [
        {
          title: 'Appointment History',
          count: history.appointmentHistory.length,
          icon: <Stethoscope className="h-4 w-4 text-[#159754]" />,
        },
        {
          title: 'Prescription History',
          count: history.prescriptionHistory.length,
          icon: <FileText className="h-4 w-4 text-[#159754]" />,
        },
        {
          title: 'Uploaded Reports',
          count: history.uploadedReports.length,
          icon: <FileText className="h-4 w-4 text-[#159754]" />,
        },
        {
          title: 'Doctor Notes',
          count: history.doctorNotes.length,
          icon: <FileText className="h-4 w-4 text-[#159754]" />,
        },
      ]
    : [];

  return (
    <aside className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
      <div className="flex items-center justify-between border-b border-[#edf2ef] px-5 py-5">
        <h2 className="text-xl font-bold text-[#142e26]">Patient History</h2>
        {canClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#607d74] transition hover:bg-[#f4fbf7] hover:text-[#173a31]"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {loading ? <div className="px-5 py-8 text-sm text-[#607d74]">Loading patient history...</div> : null}
      {!loading && error ? <div className="px-5 py-8 text-sm text-[#a33b3b]">{error}</div> : null}
      {!loading && !error && history ? (
        <div className="space-y-4 p-5">
          <div className="rounded-[24px] border border-[#e3ece7] bg-[linear-gradient(180deg,#fbfefd,#f6fbf8)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1faa62] text-lg font-bold text-white">
                {history.basicDetails.patientName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-[#142e26]">{history.basicDetails.patientName}</p>
                <p className="text-sm text-[#607d74]">ID: {history.basicDetails.patientCode}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#7a9188]">Age / Gender</p>
                <p className="font-semibold text-[#173a31]">
                  {history.basicDetails.age} / {history.basicDetails.gender ?? 'NA'}
                </p>
              </div>
              <div>
                <p className="text-[#7a9188]">Assigned Doctor</p>
                <p className="font-semibold text-[#173a31]">{history.basicDetails.assignedDoctor}</p>
              </div>
              <div>
                <p className="text-[#7a9188]">Mobile</p>
                <p className="font-semibold text-[#173a31]">{history.basicDetails.phone}</p>
              </div>
              <div>
                <p className="text-[#7a9188]">Registration</p>
                <p className="font-semibold text-[#173a31]">{history.basicDetails.registrationDate}</p>
              </div>
              <div>
                <p className="text-[#7a9188]">Email</p>
                <p className="font-semibold text-[#173a31]">{history.basicDetails.email || '--'}</p>
              </div>
              <div>
                <p className="text-[#7a9188]">Total Visits</p>
                <p className="font-semibold text-[#173a31]">{history.basicDetails.totalVisits}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {historySections.map((section) => (
              <div key={section.title} className="flex items-center justify-between rounded-[22px] border border-[#e3ece7] bg-[#fbfdfc] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf8f1]">{section.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#173a31]">{section.title}</p>
                    <p className="text-xs text-[#607d74]">{section.count} records</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#edf8f1] px-2.5 py-1 text-xs font-semibold text-[#159754]">
                  {section.count}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-[#e3ece7] bg-white">
            <div className="border-b border-[#edf2ef] px-4 py-3">
              <p className="text-sm font-bold text-[#142e26]">Medical History</p>
            </div>
            <div className="grid gap-3 px-4 py-4 text-sm text-[#173a31]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Allergies</p>
                <p className="mt-1">{history.medicalHistory.allergies || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Chronic Diseases</p>
                <p className="mt-1">{history.medicalHistory.chronicDiseases || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Past Surgeries</p>
                <p className="mt-1">{history.medicalHistory.pastSurgeries || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Previous Treatments</p>
                <p className="mt-1">{history.medicalHistory.previousTreatments || '--'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Weight</p>
                  <p className="mt-1">{history.medicalHistory.weight || '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Height</p>
                  <p className="mt-1">{history.medicalHistory.height || '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">BP</p>
                  <p className="mt-1">{history.medicalHistory.bp || '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Sugar</p>
                  <p className="mt-1">{history.medicalHistory.sugar || '--'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Health Problem</p>
                <p className="mt-1">{history.medicalHistory.healthProblem || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Additional Notes</p>
                <p className="mt-1">{history.medicalHistory.additionalNotes || '--'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3ece7] bg-white">
            <div className="border-b border-[#edf2ef] px-4 py-3">
              <p className="text-sm font-bold text-[#142e26]">Appointment History</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {history.appointmentHistory.length > 0 ? history.appointmentHistory.map((item) => (
                <div key={item.appointmentId} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#173a31]">{item.date} | {item.time}</p>
                      <p className="text-xs text-[#607d74]">{item.doctorName} | {item.appointmentType}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#173a31]">Billing: {item.billingAmount}</p>
                  <p className="mt-1 text-sm text-[#607d74]">{item.notes || 'No appointment notes added.'}</p>
                </div>
              )) : <p className="text-sm text-[#607d74]">No appointment history found.</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3ece7] bg-white">
            <div className="border-b border-[#edf2ef] px-4 py-3">
              <p className="text-sm font-bold text-[#142e26]">Prescription History</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {history.prescriptionHistory.length > 0 ? history.prescriptionHistory.map((item) => (
                <div key={item.prescriptionId} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                  <p className="text-sm font-semibold text-[#173a31]">{item.date} | {item.doctorName}</p>
                  <p className="mt-1 text-sm text-[#173a31]">Diagnosis: {item.diagnosis}</p>
                  <p className="mt-1 text-sm text-[#607d74]">
                    Medicines: {item.medicines.length > 0 ? item.medicines.join(', ') : 'No medicines listed'}
                  </p>
                  <p className="mt-1 text-sm text-[#607d74]">{item.notes || 'No prescription notes added.'}</p>
                </div>
              )) : <p className="text-sm text-[#607d74]">No prescription history found.</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3ece7] bg-white">
            <div className="border-b border-[#edf2ef] px-4 py-3">
              <p className="text-sm font-bold text-[#142e26]">Uploaded Reports / Files</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {history.uploadedReports.length > 0 ? history.uploadedReports.map((item) => (
                <a
                  key={item.documentId}
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3 transition hover:border-[#1faa62]/35 hover:bg-[#f4fbf7]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#173a31]">{item.fileName}</p>
                    <p className="text-xs text-[#607d74]">{item.fileType}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#607d74]">{formatDateTime(item.uploadedAt)}</span>
                </a>
              )) : <p className="text-sm text-[#607d74]">No uploaded reports found.</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3ece7] bg-white">
            <div className="border-b border-[#edf2ef] px-4 py-3">
              <p className="text-sm font-bold text-[#142e26]">Doctor Notes</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {history.doctorNotes.length > 0 ? history.doctorNotes.map((item, index) => (
                <div key={`${item.source}-${item.date}-${index}`} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#173a31]">{item.source}</p>
                    <span className="text-xs text-[#607d74]">{item.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#607d74]">{item.note}</p>
                </div>
              )) : <p className="text-sm text-[#607d74]">No doctor notes found.</p>}
            </div>
          </div>

          <div className="space-y-2 rounded-[24px] border border-[#d7eadf] bg-[linear-gradient(180deg,#f8fefb,#eef9f2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={downloading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#159754] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(21,151,84,0.24)] transition hover:bg-[#128549] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading Full History...' : 'Download Full History (PDF)'}
            </button>
            <p className="text-center text-xs leading-5 text-[#607d74]">
              This downloads the selected patient&apos;s complete history in PDF format.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

export default PatientHistoryPanel;
