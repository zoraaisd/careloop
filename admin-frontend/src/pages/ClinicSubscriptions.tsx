const plans = [
  {
    name: 'Starter',
    description: 'Basic plan for small clinics',
    price: 'Rs 999 / month',
    doctorsLimit: '2 doctors',
    patientsLimit: '500 patients',
    whatsappLimit: '5,000 messages',
    status: 'Active',
  },
  {
    name: 'Growth',
    description: 'Best for growing clinics',
    price: 'Rs 1,999 / month',
    doctorsLimit: '5 doctors',
    patientsLimit: '2,000 patients',
    whatsappLimit: '10,000 messages',
    status: 'Active',
  },
  {
    name: 'Pro',
    description: 'Advanced plan for scaling clinics',
    price: 'Rs 3,999 / month',
    doctorsLimit: '10 doctors',
    patientsLimit: '5,000 patients',
    whatsappLimit: '20,000 messages',
    status: 'Active',
  },
];

const paymentHistory = [
  { clinic: 'Green Valley Clinic', plan: 'Pro', amount: 'Rs 1,200', date: '2026-04-15', status: 'Paid' },
  { clinic: 'Healthy Path Care', plan: 'Growth', amount: 'Rs 650', date: '2026-04-12', status: 'Paid' },
  { clinic: 'Prime Ortho Center', plan: 'Growth', amount: 'Rs 650', date: '2026-04-09', status: 'Failed' },
];

const ClinicSubscriptions = () => {
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

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h4 className="text-2xl font-semibold text-slate-900">All Subscription Plans</h4>
        <p className="mt-1 text-sm text-slate-500">
          Plan list is shown in boxes for better readability and alignment.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
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

              <p className="mt-4 text-lg font-semibold text-slate-900">{plan.price}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Doctors Limit: {plan.doctorsLimit}</p>
                <p>Patients Limit: {plan.patientsLimit}</p>
                <p>WhatsApp Limit: {plan.whatsappLimit}</p>
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
