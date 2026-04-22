const clinicRequests = [
  { clinic: 'Bright Smile Clinic', city: 'Jaipur', owner: 'Dr. Kavya S', requestedOn: '2026-04-20', status: 'Pending' },
  { clinic: 'Advanced Health Care', city: 'Chandigarh', owner: 'Dr. Rohan M', requestedOn: '2026-04-19', status: 'Under Review' },
  { clinic: 'Life Line Hospital', city: 'Bhopal', owner: 'Dr. Arjun T', requestedOn: '2026-04-18', status: 'Pending' },
];

const ClinicRequests = () => {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Clinic Requests</h3>
        <p className="mt-1 text-sm text-slate-500">Review newly submitted clinic onboarding requests.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Requested On</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {clinicRequests.map((request) => (
              <tr className="border-b border-slate-100 text-slate-700" key={`${request.clinic}-${request.requestedOn}`}>
                <td className="px-4 py-3 font-medium">{request.clinic}</td>
                <td className="px-4 py-3">{request.city}</td>
                <td className="px-4 py-3">{request.owner}</td>
                <td className="px-4 py-3">{request.requestedOn}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {request.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export { ClinicRequests };
