import { useEffect, useState } from 'react';

import { formatCurrency, formatNumber, formatPlanPrice, getBilling, getPayments, type BillingResponse, type PaymentRecord } from '@/services/admin';

const ClinicSubscriptions = () => {
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const [billingResponse, paymentResponse] = await Promise.all([getBilling(), getPayments()]);
      setBilling(billingResponse);
      setPayments(paymentResponse);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h4 className="text-sm font-semibold text-slate-900">Recent Payments</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr className="border-b border-slate-100 text-slate-700" key={payment.id}>
                  <td className="px-4 py-3">{payment.clinicName}</td>
                  <td className="px-4 py-3">{payment.planName}</td>
                  <td className="numeric-display px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="px-4 py-3">{payment.paidOn}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h4 className="text-2xl font-semibold text-slate-900">All Subscription Plans</h4>
        <p className="mt-1 text-sm text-slate-500">
          Plan list is shown in boxes for better readability and alignment.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(billing?.plans ?? []).map((plan) => (
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
          ))}
        </div>
      </section>
    </div>
  );
};

export { ClinicSubscriptions };
