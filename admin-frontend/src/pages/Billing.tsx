import { useEffect, useState } from 'react';
import { IoArrowUp, IoCheckmarkCircle, IoWalletOutline, IoWarningOutline } from 'react-icons/io5';

import { formatPlanPrice, getBilling, type BillingResponse, type SubscriptionPlan } from '@/services/admin';

const dummyPlans: SubscriptionPlan[] = [
  {
    id: 'dummy-starter',
    name: 'Starter',
    description: 'Basic plan for small clinics',
    price: 999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 2,
    patientsLimit: 500,
    whatsappLimit: 5000,
    status: 'Active',
  },
  {
    id: 'dummy-growth',
    name: 'Growth',
    description: 'Best for growing clinics',
    price: 1999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 5,
    patientsLimit: 2000,
    whatsappLimit: 10000,
    status: 'Active',
  },
  {
    id: 'dummy-pro',
    name: 'Pro',
    description: 'Advanced plan for scaling clinics',
    price: 3999,
    currency: 'INR',
    billingCycle: 'month',
    doctorsLimit: 10,
    patientsLimit: 5000,
    whatsappLimit: 20000,
    status: 'Active',
  },
];

const Billing = () => {
  const [data, setData] = useState<BillingResponse | null>(null);

  useEffect(() => {
    void (async () => {
      setData(await getBilling());
    })();
  }, []);

  const plans = data?.plans?.length ? data.plans.slice(0, 3) : dummyPlans;

  const overviewCards = data
    ? [
        {
          title: 'Total Plans',
          value: String(data.overview.totalPlans),
          note: 'Active plans',
          icon: IoCheckmarkCircle,
          accent: 'from-emerald-500/15 to-emerald-100/40',
        },
        {
          title: 'Active Subscriptions',
          value: String(data.overview.activeSubscriptions),
          note: '+12 this month',
          icon: IoArrowUp,
          accent: 'from-sky-500/15 to-emerald-100/40',
        },
        {
          title: 'Monthly Revenue',
          value: data.overview.monthlyRevenue,
          note: '+18% this month',
          icon: IoWalletOutline,
          accent: 'from-amber-400/20 to-emerald-100/40',
        },
        {
          title: 'Expired Subscriptions',
          value: String(data.overview.expiredSubscriptions),
          note: 'Needs follow-up',
          icon: IoWarningOutline,
          accent: 'from-rose-400/15 to-emerald-100/40',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(240,253,250,0.95))] p-4 shadow-[0_24px_60px_-46px_rgba(16,185,129,0.7)] sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const CardIcon = card.icon;

            return (
              <article
                className="rounded-[24px] border border-emerald-100/90 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,118,110,0.85)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300"
                key={card.title}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-[1.05rem] font-medium text-slate-600">{card.title}</h4>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-emerald-700 ring-1 ring-emerald-100`}
                  >
                    <CardIcon className="text-xl" />
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-emerald-700">{card.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,118,110,0.25)] sm:p-6">
        <h4 className="text-2xl font-semibold text-slate-900">All Subscription Plans</h4>
        <p className="mt-1 text-sm text-slate-500">
          Plan list is shown in boxes for better readability and alignment.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fffc_100%)] p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_45px_-34px_rgba(16,185,129,0.8)]"
              key={plan.name}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="text-xl font-semibold text-slate-900">{plan.name}</h5>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {plan.status}
                </span>
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-900">{formatPlanPrice(plan)}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Doctors Limit: {plan.doctorsLimit} doctors</p>
                <p>Patients Limit: {plan.patientsLimit.toLocaleString('en-IN')} patients</p>
                <p>WhatsApp Limit: {plan.whatsappLimit.toLocaleString('en-IN')} messages</p>
              </div>

              <div className="mt-6">
                <button
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-700 hover:shadow-md"
                  type="button"
                >
                  Get Started
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export { Billing };
