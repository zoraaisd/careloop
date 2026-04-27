import { useEffect, useState } from 'react';

import { apiClient } from '@/services/api';
import { AddDoctorModal } from '@/components/AddDoctorModal';

type AccessState = {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'inactive' | 'active';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  accessState: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal: boolean;
  canAppearPublicly: boolean;
  hasActiveTrial: boolean;
  clinicId?: string;
  message: string;
};

const statusTheme = {
  full_access: {
    banner: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    title: 'Doctor workspace active',
  },
  pending_review: {
    banner: 'border-amber-200 bg-amber-50 text-amber-900',
    title: 'Admin review in progress',
  },
  subscription_required: {
    banner: 'border-sky-200 bg-sky-50 text-sky-900',
    title: 'Subscription required',
  },
  rejected: {
    banner: 'border-rose-200 bg-rose-50 text-rose-900',
    title: 'Access blocked',
  },
} as const;

const DashboardPage = () => {
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadAccessState = async () => {
      try {
        const { data } = await apiClient.get<AccessState>('/doctor/access-state');
        setAccessState(data);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAccessState();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f0f4f3] px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-6 text-sm text-slate-600 shadow-lg">
          Loading your doctor workspace...
        </div>
      </div>
    );
  }

  if (!accessState) {
    return null;
  }

  const shouldAllowApprovedDoctorDashboard =
    accessState.approvalStatus === 'approved' && accessState.accessState === 'subscription_required';

  if (!shouldAllowApprovedDoctorDashboard && (accessState.accessState === 'subscription_required' || accessState.accessState === 'rejected')) {
    const theme = statusTheme[accessState.accessState];

    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f0f4f3] px-4 py-10">
        <section className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#16A34A]">Care Loop Doctor</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{theme.title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{accessState.message}</p>

          <div className={['mt-6 rounded-[24px] border px-5 py-5', theme.banner].join(' ')}>
            <p className="text-sm font-semibold">
              Approval status: <span className="capitalize">{accessState.approvalStatus}</span>
            </p>
            <p className="mt-2 text-sm font-semibold">
              Subscription status: <span className="capitalize">{accessState.subscriptionStatus}</span>
            </p>
            <p className="mt-2 text-sm font-semibold">
              Trial ends:{' '}
              <span>
                {accessState.trialEndsAt ? new Date(accessState.trialEndsAt).toLocaleString('en-IN') : 'N/A'}
              </span>
            </p>
          </div>

          {accessState.accessState === 'subscription_required' ? (
            <div className="mt-6 rounded-[24px] border border-sky-100 bg-sky-50 p-5 text-sm leading-7 text-slate-600">
              Your free trial has ended immediately for testing. Keep the login active for billing access only, then
              connect this screen to your payment checkout when you're ready to add the live billing flow.
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  const effectiveState = shouldAllowApprovedDoctorDashboard ? 'full_access' : accessState.accessState;
  const theme = statusTheme[effectiveState];

  return (
    <div className="min-h-dvh w-full overflow-hidden bg-[#f0f4f3]">
      <div className={['mx-4 mt-4 flex flex-col gap-3 rounded-[24px] border px-5 py-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between', theme.banner].join(' ')}>
        <div>
          <p className="font-semibold">{theme.title}</p>
          <p className="mt-1">
            {shouldAllowApprovedDoctorDashboard
              ? 'Your profile is approved, so your doctor workspace is available.'
              : accessState.message}
            {accessState.trialEndsAt ? ` Trial ends on ${new Date(accessState.trialEndsAt).toLocaleDateString('en-IN')}.` : ''}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-white px-4 py-2 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
        >
          Add Doctor
        </button>
      </div>
      <iframe
        className="min-h-[calc(100dvh-5.5rem)] w-full border-none"
        src="/legacy/index.html"
        title="Legacy Doctor Dashboard"
      />
      <AddDoctorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        clinicId={accessState.clinicId} 
      />
    </div>
  );
};

export { DashboardPage };
