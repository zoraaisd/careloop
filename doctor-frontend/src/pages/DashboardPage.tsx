import { useEffect, useState } from 'react';
import axios from 'axios';

import { apiClient } from '@/services/api';

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
  subscribedPlan?: {
    planId: string;
    planName: string;
    amount: number;
    currency: string;
  };
};

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'week' | 'month' | 'year';
  doctorsLimit: number;
  patientsLimit: number;
  whatsappLimit: number;
  status: 'Active' | 'Inactive' | 'Archived';
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
    title: 'Choose your plan',
  },
  rejected: {
    banner: 'border-rose-200 bg-rose-50 text-rose-900',
    title: 'Access blocked',
  },
} as const;

const formatCurrency = (amount: number, currency = 'INR') => {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toLocaleString('en-US')}`;
};

const PlanCard = ({
  plan,
  isSubscribing,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  isSubscribing: boolean;
  onSubscribe: (planId: string) => void;
}) => (
  <article
    key={plan.id}
    className="relative flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_20px_48px_-16px_rgba(16,185,129,0.35)]"
    style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f0fdf6 100%)' }}
  >
    {/* Accent bar */}
    <div className="absolute left-0 top-0 h-1 w-full rounded-t-[28px] bg-gradient-to-r from-emerald-400 to-teal-500" />

    <div className="mt-2 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
        {plan.status}
      </span>
    </div>

    <p className="mt-5 text-3xl font-extrabold text-slate-950">
      {plan.price === 0 ? 'Free' : formatCurrency(plan.price, plan.currency)}
      {plan.price !== 0 && <span className="ml-1 text-base font-medium text-slate-400">/ {plan.billingCycle}</span>}
    </p>

    <ul className="mt-5 space-y-2 text-sm text-slate-600">
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs">✓</span>
        Up to <strong className="ml-1 text-slate-900">{plan.doctorsLimit}</strong>&nbsp;doctors
      </li>
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs">✓</span>
        Up to <strong className="ml-1 text-slate-900">{plan.patientsLimit.toLocaleString('en-IN')}</strong>&nbsp;patients
      </li>
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs">✓</span>
        <strong className="text-slate-900">{plan.whatsappLimit.toLocaleString('en-IN')}</strong>&nbsp;WhatsApp messages
      </li>
    </ul>

    <div className="mt-auto pt-6">
      <button
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.45)] transition duration-200 hover:from-emerald-600 hover:to-teal-600 hover:shadow-[0_6px_20px_0_rgba(16,185,129,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubscribing}
        onClick={() => onSubscribe(plan.id)}
        type="button"
      >
        {isSubscribing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            Activating…
          </span>
        ) : (
          plan.id === 'plan-free-trial' ? 'Start Free Trial' : 'Subscribe Now'
        )}
      </button>
    </div>
  </article>
);

const DashboardPage = () => {
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'upi_apps'>('upi');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_UPGRADE') {
        setIsUpgrading(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadAccessState = async () => {
    try {
      const { data } = await apiClient.get<AccessState>('/doctor/access-state');
      setAccessState(data);
      return data;
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Unable to load doctor access state.'
        : 'Unable to load doctor access state.';
      setLoadError(message);
      return null;
    }
  };

  const loadPlans = () => {
    setPlans([
      {
        id: 'plan-free-trial',
        name: 'Free Trial',
        description: '7-day full access',
        price: 0,
        currency: 'INR',
        billingCycle: 'week',
        doctorsLimit: 1,
        patientsLimit: 3,
        whatsappLimit: 200,
        status: 'Active',
      },
      {
        id: 'plan-starter',
        name: 'Starter',
        description: 'Perfect for solo practitioners & small clinics',
        price: 1999,
        currency: 'INR',
        billingCycle: 'month',
        doctorsLimit: 2,
        patientsLimit: 500,
        whatsappLimit: 1000,
        status: 'Active',
      },
      {
        id: 'plan-pro',
        name: 'Pro',
        description: 'Advanced features for growing clinics',
        price: 4999,
        currency: 'INR',
        billingCycle: 'month',
        doctorsLimit: 10,
        patientsLimit: 5000,
        whatsappLimit: 10000,
        status: 'Active',
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise',
        description: 'Full power for large hospitals',
        price: 14999,
        currency: 'INR',
        billingCycle: 'month',
        doctorsLimit: 50,
        patientsLimit: 50000,
        whatsappLimit: 100000,
        status: 'Active',
      },
    ]);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadAccessState();
      // Always pre-load plans — shown for approved+unsubscribed doctors
      loadPlans();
      setIsLoading(false);
    };
    void init();
  }, []);

  useEffect(() => {
    if (!accessState) {
      return;
    }

    window.localStorage.setItem(
      'meditracker.doctor.accessState',
      JSON.stringify({
        approvalStatus: accessState.approvalStatus,
        accessState: accessState.accessState,
        canAccessPortal: accessState.canAccessPortal,
        clinicId: accessState.clinicId ?? null,
        subscribedPlan: accessState.subscribedPlan ?? null,
      }),
    );
  }, [accessState]);

  const handleSubscribeClick = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    if (plan.id === 'plan-free-trial') {
      setSubscribingPlanId(plan.id);
      setSubscribeError('');
      try {
        const { data } = await apiClient.post<AccessState>('/doctor/subscribe', { planId: plan.id });
        setAccessState(data);
        // Refresh after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        setSubscribeError('Failed to activate trial. Please try again.');
        setSubscribingPlanId(null);
      }
      return;
    }

    setPaymentPlan(plan);
    setPaymentMethod('upi');
    setSubscribeError('');
    setPaymentSuccess(false);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentPlan) return;
    setSubscribingPlanId(paymentPlan.id);
    setSubscribeError('');
    try {
      const { data } = await apiClient.post<AccessState>('/doctor/subscribe', { planId: paymentPlan.id });
      setPaymentSuccess(true);
      setTimeout(() => {
        setAccessState(data);
        setPaymentPlan(null);
        setPaymentSuccess(false);
      }, 3000);
    } catch (error) {
      const msg = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Subscription failed. Please try again.'
        : 'Subscription failed. Please try again.';
      setSubscribeError(msg);
    } finally {
      setSubscribingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f0f4f3] px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-6 text-sm text-slate-600 shadow-lg">
          Loading your doctor workspace…
        </div>
      </div>
    );
  }

  if (!accessState) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f0f4f3] px-4">
        <div className="rounded-[28px] border border-rose-200 bg-white px-8 py-6 text-sm text-rose-700 shadow-lg">
          {loadError || 'Unable to load doctor workspace.'}
        </div>
      </div>
    );
  }

  const theme = statusTheme[accessState.accessState];

  // Full access → show the legacy dashboard iframe
  if (accessState.accessState === 'full_access' && !isUpgrading) {
    return (
      <div className="min-h-dvh w-full overflow-hidden bg-[#f0f4f3]">
        <iframe
          className="min-h-dvh w-full border-none"
          src="/legacy/index.html"
          title="Legacy Doctor Dashboard"
        />
      </div>
    );
  }

  // Rejected → simple block screen
  if (accessState.accessState === 'rejected') {
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
          </div>
        </section>
      </main>
    );
  }

  // Pending review → informational screen
  if (accessState.accessState === 'pending_review') {
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
          </div>
        </section>
      </main>
    );
  }

  // subscription_required → plan selection screen
  return (
    <main
      className="min-h-dvh bg-[#f0f4f3] px-4 py-10"
      style={{
        background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.08) 0%, transparent 55%), #f0f4f3',
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-600">Care Loop Doctor</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
            Choose your subscription plan
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Your account is approved. Subscribe to unlock your full doctor workspace.
          </p>
        </div>

        {/* Status banner */}
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-bold">✓</span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Account approved — select a plan below</p>
            <p className="text-xs text-emerald-700">Subscription will be activated instantly (demo mode)</p>
          </div>
        </div>

        {/* Error alert */}
        {subscribeError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {subscribeError}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-5 md:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              isSubscribing={subscribingPlanId === plan.id}
              onSubscribe={handleSubscribeClick}
              plan={plan}
            />
          ))}
        </div>

        {/* Payment Modal */}
        {paymentPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              {paymentSuccess ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <span className="text-3xl text-emerald-600">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
                  <p className="mt-2 text-slate-500">
                    You subscribed to the <strong>{paymentPlan.name}</strong> plan.<br />
                    Redirecting to your dashboard...
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Select Payment Method</h3>
                    <button 
                      onClick={() => setPaymentPlan(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <p className="mb-4 text-sm text-slate-500">
                      Amount to pay: <strong className="text-lg text-slate-900">{formatCurrency(paymentPlan.price, paymentPlan.currency)}</strong>
                    </p>
                    <div className="space-y-3">
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="upi" 
                          checked={paymentMethod === 'upi'}
                          onChange={() => setPaymentMethod('upi')}
                          className="h-4 w-4 text-emerald-600"
                        />
                        <span className="font-medium text-slate-700">UPI ID / Virtual Payment Address</span>
                      </label>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === 'upi_apps' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="upi_apps" 
                          checked={paymentMethod === 'upi_apps'}
                          onChange={() => setPaymentMethod('upi_apps')}
                          className="h-4 w-4 text-emerald-600"
                        />
                        <span className="font-medium text-slate-700">UPI Apps (GPay, PhonePe, Paytm)</span>
                      </label>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="card" 
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="h-4 w-4 text-emerald-600"
                        />
                        <span className="font-medium text-slate-700">Credit / Debit Card</span>
                      </label>
                    </div>
                  </div>

                  {subscribeError && (
                    <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                      {subscribeError}
                    </div>
                  )}

                  <button
                    onClick={handlePaymentSubmit}
                    disabled={subscribingPlanId !== null}
                    className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {subscribingPlanId ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      `Pay ${formatCurrency(paymentPlan.price, paymentPlan.currency)}`
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Demo mode — no real payment is processed. Subscription activates instantly.
        </p>
      </div>
    </main>
  );
};

export { DashboardPage };
