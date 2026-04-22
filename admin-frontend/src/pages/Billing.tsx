import { useEffect, useState } from 'react';

import { formatPlanPrice, getBilling, type BillingResponse } from '@/services/admin';

const Billing = () => {
  const [data, setData] = useState<BillingResponse | null>(null);

  useEffect(() => {
    void (async () => {
      setData(await getBilling());
    })();
  }, []);

  const overviewCards = data
    ? [
        { title: 'Total Plans', value: String(data.overview.totalPlans), note: 'Active plans' },
        { title: 'Active Subscriptions', value: String(data.overview.activeSubscriptions), note: 'Current subscriptions' },
        { title: 'Monthly Revenue', value: data.overview.monthlyRevenue, note: 'Collected payments' },
        { title: 'Expired Subscriptions', value: String(data.overview.expiredSubscriptions), note: 'Needs follow-up' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <article
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-300"
            key={card.title}
          >
            <h4 className="text-base font-medium text-slate-600">{card.title}</h4>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-sm text-emerald-700">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h4 className="text-2xl font-semibold text-slate-900">All Subscription Plans</h4>
        <p className="mt-1 text-sm text-slate-500">
          Plan list is shown in boxes for better readability and alignment.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(data?.plans ?? []).map((plan) => (
            <article
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-white"
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
