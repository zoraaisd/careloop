import React, { useEffect, useState } from 'react';
import { FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import {
  getClinicRequests,
  getDoctorRequests,
  approveDoctorRequest,
  rejectDoctorRequest,
  type ClinicRequest,
  type DoctorRequest,
} from '@/services/admin';

const ClinicRequests = () => {
  const [clinicRequests, setClinicRequests] = useState<ClinicRequest[]>([]);
  const [doctorRequests, setDoctorRequests] = useState<DoctorRequest[]>([]);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clinics, doctors] = await Promise.all([getClinicRequests(), getDoctorRequests()]);
      setClinicRequests(clinics);
      setDoctorRequests(doctors);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (doctorId: string, action: 'approve' | 'reject') => {
    setActioningId(doctorId);
    try {
      if (action === 'approve') {
        await approveDoctorRequest(doctorId);
      } else {
        await rejectDoctorRequest(doctorId);
      }
      await loadData();
    } catch (error) {
      alert(`Failed to ${action} doctor. Please try again.`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Clinic Requests</h3>
          <p className="mt-1 text-sm text-slate-500">Review newly submitted clinic onboarding requests.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Requested On</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    Loading requests...
                  </td>
                </tr>
              ) : clinicRequests.length > 0 ? (
                clinicRequests.map((request) => {
                  const isExpanded = expandedClinic === request.id;
                  const clinicDoctors = doctorRequests.filter(
                    (d) => request.clinicId
                      ? d.clinicId === request.clinicId
                      : d.clinicName.toLowerCase() === request.clinic.toLowerCase()
                  );

                  return (
                    <React.Fragment key={request.id}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                        onClick={() => {
                          setExpandedClinic(isExpanded ? null : request.id);
                          setExpandedDoctor(null);
                        }}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {clinicDoctors.length > 0 && (
                            isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {request.clinic}
                          {request.clinicId && (
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              {request.clinicId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{request.city}</td>
                        <td className="px-4 py-3">{request.owner}</td>
                        <td className="numeric-inline px-4 py-3">{request.requestedOn}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            request.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && clinicDoctors.length > 0 && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/30 px-4 py-4 lg:px-8">
                            <div className="space-y-3">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Associated Doctors ({clinicDoctors.length})
                              </h4>
                              
                              <div className="grid gap-3">
                                {clinicDoctors.map((doc) => {
                                  const isDocExpanded = expandedDoctor === doc.userId;
                                  return (
                                    <div key={doc.userId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200">
                                      <button
                                        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-emerald-50/50"
                                        onClick={() => setExpandedDoctor(isDocExpanded ? null : doc.userId)}
                                        type="button"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                                            {doc.name.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                                            <p className="text-[11px] text-slate-500">{doc.specialization} • {doc.experience} years exp</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            doc.approvalStatus === 'approved' ? 'text-emerald-600' : 
                                            doc.approvalStatus === 'pending' ? 'text-amber-600' : 'text-rose-600'
                                          }`}>
                                            {doc.approvalStatus}
                                          </span>
                                          {isDocExpanded ? <FiChevronUp size={16} className="text-slate-400" /> : <FiChevronDown size={16} className="text-slate-400" />}
                                        </div>
                                      </button>

                                      {isDocExpanded && (
                                        <div className="border-t border-slate-100 bg-white px-5 py-6">
                                          <div className="grid gap-y-6 sm:grid-cols-2">
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Doctor Name</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.phone}</p>
                                            </div>

                                            <div className="sm:col-span-2 space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clinic Address</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.clinicAddress}</p>
                                            </div>

                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">City</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.city}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Specialization</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.specialization}</p>
                                            </div>

                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Qualification</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.qualification}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Experience (Years)</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.experience}</p>
                                            </div>

                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultation Fees</p>
                                              <p className="text-sm font-bold text-slate-900">₹{doc.consultationFees}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Name</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.medicalCouncilBoard.split(' ')[0].toLowerCase()}</p>
                                            </div>

                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Code</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.medicalRegistrationNumber}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Board</p>
                                              <p className="text-sm font-medium text-slate-900">{doc.medicalCouncilBoard}</p>
                                            </div>

                                            <div className="sm:col-span-2 space-y-1">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">About Doctor</p>
                                              <p className="text-sm text-slate-600 leading-relaxed">{doc.aboutDoctor || 'No description provided.'}</p>
                                            </div>
                                          </div>

                                          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                                            <div className="flex gap-4">
                                              {doc.profileImageUrl && (
                                                <a className="text-xs font-bold text-emerald-700 hover:underline" href={doc.profileImageUrl} rel="noreferrer" target="_blank">View Photo</a>
                                              )}
                                              {doc.certificateUrl && (
                                                <a className="text-xs font-bold text-emerald-700 hover:underline" href={doc.certificateUrl} rel="noreferrer" target="_blank">View Certificate</a>
                                              )}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                              {doc.approvalStatus === 'pending' ? (
                                                <>
                                                  <button
                                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                                    disabled={actioningId === doc.userId}
                                                    onClick={() => void handleAction(doc.userId, 'approve')}
                                                  >
                                                    {actioningId === doc.userId ? 'Saving...' : 'Approve Profile'}
                                                  </button>
                                                  <button
                                                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                                    disabled={actioningId === doc.userId}
                                                    onClick={() => void handleAction(doc.userId, 'reject')}
                                                  >
                                                    Reject
                                                  </button>
                                                </>
                                              ) : (
                                                <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                                                  doc.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                  <FiCheck size={14} /> {doc.approvalStatus}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    No pending clinic requests at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export { ClinicRequests };
