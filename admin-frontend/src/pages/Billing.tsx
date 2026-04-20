const plans = [
  { name: 'Starter', activePlans: 258, expiry: '30 Jun 2026', paymentStatus: 'Paid' },
  { name: 'Growth', activePlans: 412, expiry: '15 Jul 2026', paymentStatus: 'Paid' },
  { name: 'Enterprise', activePlans: 194, expiry: '10 Aug 2026', paymentStatus: 'Pending' },
];

const paymentHistory = [
  { clinic: 'Green Valley Clinic', plan: 'Enterprise', amount: '$1,200', date: '2026-04-15', status: 'Paid' },
  { clinic: 'Healthy Path Care', plan: 'Growth', amount: '$650', date: '2026-04-12', status: 'Paid' },
  { clinic: 'Prime Ortho Center', plan: 'Growth', amount: '$650', date: '2026-04-09', status: 'Failed' },
];

const Billing = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Billing & Subscription</h3>
        <p className="mt-1 text-sm text-slate-500">
          View subscription plans, manage clinic subscriptions, payment history, and track revenue.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm" key={plan.name}>
            <h4 className="text-base font-semibold text-slate-900">{plan.name}</h4>
            <p className="mt-2 text-sm text-slate-500">Active Plans</p>
            <p className="text-2xl font-bold text-slate-900">{plan.activePlans}</p>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>Subscription Expiry: {plan.expiry}</p>
              <p>
                Payment Status:{' '}
                <span className="font-semibold text-emerald-700">{plan.paymentStatus}</span>
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h4 className="text-sm font-semibold text-slate-900">Payment History</h4>
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
              {paymentHistory.map((payment) => (
                <tr className="border-b border-slate-100 text-slate-700" key={`${payment.clinic}-${payment.date}`}>
                  <td className="px-4 py-3">{payment.clinic}</td>
                  <td className="px-4 py-3">{payment.plan}</td>
                  <td className="px-4 py-3 font-semibold">{payment.amount}</td>
                  <td className="px-4 py-3">{payment.date}</td>
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
    </div>
  );
};

export { Billing };
