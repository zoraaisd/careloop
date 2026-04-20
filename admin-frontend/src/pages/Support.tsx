const supportTickets = [
  {
    clinicName: 'Green Valley Clinic',
    issueTitle: 'Unable to export patient records',
    description: 'CSV export fails for data larger than 500 records.',
    status: 'Open',
    priority: 'High',
    createdDate: '2026-04-17',
  },
  {
    clinicName: 'Healthy Path Care',
    issueTitle: 'Subscription renewal not reflecting',
    description: 'Payment is done but plan still shows expired.',
    status: 'In Progress',
    priority: 'Medium',
    createdDate: '2026-04-16',
  },
  {
    clinicName: 'Prime Ortho Center',
    issueTitle: 'Doctor onboarding approval delay',
    description: 'Requested onboarding remains pending for 48 hours.',
    status: 'Resolved',
    priority: 'Low',
    createdDate: '2026-04-14',
  },
];

const Support = () => {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Support Issues</h3>
        <p className="mt-1 text-sm text-slate-500">
          View support tickets, respond to issues, update ticket status, and track resolution.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Clinic Name</th>
              <th className="px-4 py-3">Issue Title</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {supportTickets.map((ticket) => (
              <tr className="border-b border-slate-100 text-slate-700" key={`${ticket.clinicName}-${ticket.issueTitle}`}>
                <td className="px-4 py-3 font-medium">{ticket.clinicName}</td>
                <td className="px-4 py-3">{ticket.issueTitle}</td>
                <td className="px-4 py-3">{ticket.description}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3">{ticket.priority}</td>
                <td className="px-4 py-3">{ticket.createdDate}</td>
                <td className="px-4 py-3">
                  <button
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    type="button"
                  >
                    Respond
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export { Support };
