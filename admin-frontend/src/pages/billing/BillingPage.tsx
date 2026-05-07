import { useEffect, useState, type FormEvent } from 'react';
import { IoArrowUp, IoCheckmarkCircle, IoWalletOutline, IoWarningOutline } from 'react-icons/io5';

import {
  formatMetricValue,
  formatNumber,
  formatPlanPrice,
  getBilling,
  createSubscriptionPlan,
  type BillingResponse,
  type SubscriptionPlan,
} from '@/services/admin';

type NewPlanForm = {
  name: string;
  description: string;
  price: string;
  currency: string;
  billingCycle: 'month' | 'year';
  doctorsLimit: string;
  patientsLimit: string;
  whatsappLimit: string;
};

const emptyPlanForm: NewPlanForm = {
  name: '',
  description: '',
  price: '',
  currency: 'INR',
  billingCycle: 'month',
  doctorsLimit: '',
  patientsLimit: '',
  whatsappLimit: '',
};

const Billing = () => {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planForm, setPlanForm] = useState<NewPlanForm>(emptyPlanForm);
  const [isCreating, setIsCreating] = useState(false);
  const [planError, setPlanError] = useState('');

  const loadBilling = async () => {
    setData(await getBilling());
  };

  useEffect(() => {
    void loadBilling();
  }, []);

  const plans: SubscriptionPlan[] = data?.plans ?? [];

  const overviewCards = data
    ? [
        {
          title: 'Total Plans',
          value: formatNumber(data.overview.totalPlans),
          note: 'Active plans',
          icon: IoCheckmarkCircle,
          accent: 'from-emerald-500/15 to-emerald-100/40',
        },
        {
          title: 'Active Subscriptions',
          value: formatNumber(data.overview.activeSubscriptions),
          note: 'Current active',
          icon: IoArrowUp,
          accent: 'from-sky-500/15 to-emerald-100/40',
        },
        {
          title: 'Monthly Revenue',
          value: formatMetricValue(data.overview.monthlyRevenue),
          note: 'This month',
          icon: IoWalletOutline,
          accent: 'from-amber-400/20 to-emerald-100/40',
        },
        {
          title: 'Expired Subscriptions',
          value: formatNumber(data.overview.expiredSubscriptions),
          note: 'Needs follow-up',
          icon: IoWarningOutline,
          accent: 'from-rose-400/15 to-emerald-100/40',
        },
      ]
    : [];

  const handleCreatePlan = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPlanError('');
    setIsCreating(true);

    try {
      await createSubscriptionPlan({
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        price: Number(planForm.price),
        currency: planForm.currency,
        billingCycle: planForm.billingCycle,
        doctorsLimit: Number(planForm.doctorsLimit),
        patientsLimit: Number(planForm.patientsLimit),
        whatsappLimit: Number(planForm.whatsappLimit),
        status: 'Active',
      });
      setPlanForm(emptyPlanForm);
      setShowAddPlan(false);
      await loadBilling();
    } catch {
      setPlanError('Failed to create plan. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400';

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
                    <p className="numeric-display mt-3 text-2xl font-bold text-slate-950 sm:text-[2rem]">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-2xl font-semibold text-slate-900">All Subscription Plans</h4>
            <p className="mt-1 text-sm text-slate-500">
              Manage your subscription plans. Add custom plans for your clinics.
            </p>
          </div>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            onClick={() => setShowAddPlan(true)}
            type="button"
          >
            + Add New Plan
          </button>
        </div>

        {/* Add Plan Modal */}
        {showAddPlan && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
            <h5 className="text-lg font-semibold text-slate-900">Create New Subscription Plan</h5>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreatePlan}>
              <label className="text-sm text-slate-700">
                Plan Name
                <input className={`mt-1 ${inputClass}`} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} required type="text" value={planForm.name} />
              </label>
              <label className="text-sm text-slate-700">
                Price
                <input className={`mt-1 ${inputClass}`} min={0} onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))} required type="number" value={planForm.price} />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Description
                <input className={`mt-1 ${inputClass}`} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} required type="text" value={planForm.description} />
              </label>
              <label className="text-sm text-slate-700">
                Currency
                <select className={`mt-1 ${inputClass}`} onChange={(e) => setPlanForm((p) => ({ ...p, currency: e.target.value }))} value={planForm.currency}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Billing Cycle
                <select className={`mt-1 ${inputClass}`} onChange={(e) => setPlanForm((p) => ({ ...p, billingCycle: e.target.value as 'month' | 'year' }))} value={planForm.billingCycle}>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Doctors Limit
                <input className={`mt-1 ${inputClass}`} min={1} onChange={(e) => setPlanForm((p) => ({ ...p, doctorsLimit: e.target.value }))} required type="number" value={planForm.doctorsLimit} />
              </label>
              <label className="text-sm text-slate-700">
                Patients Limit
                <input className={`mt-1 ${inputClass}`} min={1} onChange={(e) => setPlanForm((p) => ({ ...p, patientsLimit: e.target.value }))} required type="number" value={planForm.patientsLimit} />
              </label>
              <label className="text-sm text-slate-700">
                WhatsApp Limit
                <input className={`mt-1 ${inputClass}`} min={0} onChange={(e) => setPlanForm((p) => ({ ...p, whatsappLimit: e.target.value }))} required type="number" value={planForm.whatsappLimit} />
              </label>
              <div className="flex items-end gap-3 sm:col-span-2">
                <button
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? 'Creating...' : 'Create Plan'}
                </button>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => { setShowAddPlan(false); setPlanError(''); setPlanForm(emptyPlanForm); }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
              {planError ? <p className="text-sm font-medium text-rose-600 sm:col-span-2">{planError}</p> : null}
            </form>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {plans.length > 0 ? (
            plans.map((plan) => (
              <article
                className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fffc_100%)] p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_45px_-34px_rgba(16,185,129,0.8)]"
                key={plan.id}
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

                <p className="numeric-display mt-4 text-xl font-semibold text-slate-900">
                  {formatPlanPrice(plan)}
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    Doctors Limit:{' '}
                    <span className="numeric-inline font-semibold text-slate-900">
                      {formatNumber(plan.doctorsLimit)}
                    </span>{' '}
                    doctors
                  </p>
                  <p>
                    Patients Limit:{' '}
                    <span className="numeric-inline font-semibold text-slate-900">
                      {formatNumber(plan.patientsLimit)}
                    </span>{' '}
                    patients
                  </p>
                  <p>
                    WhatsApp Limit:{' '}
                    <span className="numeric-inline font-semibold text-slate-900">
                      {formatNumber(plan.whatsappLimit)}
                    </span>{' '}
                    messages
                  </p>
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
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 lg:col-span-3">
              No subscription plans yet. Click "Add New Plan" to create one.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export { Billing };
