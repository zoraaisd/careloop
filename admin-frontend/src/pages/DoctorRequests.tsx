import { useEffect, useMemo, useState } from 'react';

import {
  approveDoctorRequest,
  formatCurrency,
  formatNumber,
  getDoctorRequests,
  rejectDoctorRequest,
  type DoctorApprovalStatus,
  type DoctorRequest,
} from '@/services/admin';

const filters: Array<{ label: string; value: DoctorApprovalStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const statusClasses: Record<DoctorApprovalStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const DoctorRequests = () => {
  const [allRequests, setAllRequests] = useState<DoctorRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<DoctorApprovalStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadAll = async () => {
    const response = await getDoctorRequests();
    setAllRequests(response);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const summary = useMemo(
    () => ({
      total: allRequests.length,
      approved: allRequests.filter((item) => item.approvalStatus === 'approved').length,
      rejected: allRequests.filter((item) => item.approvalStatus === 'rejected').length,
      pending: allRequests.filter((item) => item.approvalStatus === 'pending').length,
    }),
    [allRequests],
  );

  const filteredRequests = useMemo(
    () =>
      activeFilter === 'all'
        ? allRequests
        : allRequests.filter((item) => item.approvalStatus === activeFilter),
    [allRequests, activeFilter],
  );

  const handleAction = async (doctorId: string, action: 'approve' | 'reject') => {
    setActioningId(doctorId);
    try {
      if (action === 'approve') {
        await approveDoctorRequest(doctorId);
      } else {
        await rejectDoctorRequest(doctorId);
      }

      await loadAll();
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total doctors', value: summary.total },
          { label: 'Pending requests', value: summary.pending },
          { label: 'Approved doctors', value: summary.approved },
          { label: 'Rejected doctors', value: summary.rejected },
        ].map((card) => (
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="numeric-display mt-3 text-3xl font-bold text-slate-950">{formatNumber(card.value)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Doctor onboarding</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Doctor Requests</h2>
            <p className="mt-2 text-sm text-slate-500">
              Review doctor details, clinic information, and verification assets before making them public on Care Loop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  activeFilter === filter.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                ].join(' ')}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={index}>
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((doctor) => (
              <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={doctor.userId}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-950">{doctor.name}</h3>
                      <span
                        className={[
                          'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                          statusClasses[doctor.approvalStatus],
                        ].join(' ')}
                      >
                        {doctor.approvalStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {doctor.specialization} | {doctor.experience} years | {doctor.qualification}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {doctor.email} | {doctor.phone}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {doctor.approvalStatus !== 'approved' ? (
                      <button
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={actioningId === doctor.userId}
                        onClick={() => void handleAction(doctor.userId, 'approve')}
                        type="button"
                      >
                        {actioningId === doctor.userId ? 'Saving...' : 'Approve'}
                      </button>
                    ) : null}
                    {doctor.approvalStatus !== 'rejected' ? (
                      <button
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={actioningId === doctor.userId}
                        onClick={() => void handleAction(doctor.userId, 'reject')}
                        type="button"
                      >
                        {actioningId === doctor.userId ? 'Saving...' : 'Reject'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                  <p><span className="font-semibold text-slate-900">Council code:</span> {doctor.medicalRegistrationNumber}</p>
                  <p><span className="font-semibold text-slate-900">Council board:</span> {doctor.medicalCouncilBoard}</p>
                  <p><span className="font-semibold text-slate-900">DOB:</span> {new Date(doctor.dateOfBirth).toLocaleDateString('en-IN')}</p>
                  <p><span className="font-semibold text-slate-900">Clinic:</span> {doctor.clinicName}</p>
                  <p><span className="font-semibold text-slate-900">City:</span> {doctor.city}</p>
                  <p><span className="font-semibold text-slate-900">Fees:</span> {formatCurrency(doctor.consultationFees)}</p>
                  <p className="md:col-span-2"><span className="font-semibold text-slate-900">Address:</span> {doctor.clinicAddress}</p>
                  <p><span className="font-semibold text-slate-900">Days:</span> {doctor.availableDays.join(', ')}</p>
                  <p><span className="font-semibold text-slate-900">Slots:</span> {doctor.availableTimeSlots.join(', ')}</p>
                  <p><span className="font-semibold text-slate-900">Trial ends:</span> {doctor.trialEndsAt ? new Date(doctor.trialEndsAt).toLocaleDateString('en-IN') : 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900">Subscription:</span> {doctor.subscriptionStatus}</p>
                </div>

                {doctor.aboutDoctor ? (
                  <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">{doctor.aboutDoctor}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {doctor.profileImageUrl ? (
                    <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={doctor.profileImageUrl} rel="noreferrer" target="_blank">
                      Open profile image
                    </a>
                  ) : null}
                  {doctor.certificateUrl ? (
                    <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={doctor.certificateUrl} rel="noreferrer" target="_blank">
                      Open certificate
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No doctor requests found for this filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export { DoctorRequests };
