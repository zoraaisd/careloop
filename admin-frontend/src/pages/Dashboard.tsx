import { StatCard } from '@/components/StatCard';

const dashboardStats = [
  { title: 'Total Doctors', value: '2,486' },
  { title: 'Total Patients', value: '128,540' },
  { title: 'Active Subscriptions', value: '864' },
  { title: 'Revenue Statistics', value: '$100.3K' },
  { title: 'WhatsApp Messages Sent', value: '78,920' },
  { title: 'Total Number of Clinics', value: '912' },
];

const recentClinics = [
  { clinicName: 'Green Valley Clinic', owner: 'Dr. A. Sharma', city: 'Bangalore', status: 'Pending' },
  { clinicName: 'Healthy Path Care', owner: 'Dr. M. Patel', city: 'Pune', status: 'Approved' },
  { clinicName: 'Prime Ortho Center', owner: 'Dr. N. Rao', city: 'Hyderabad', status: 'Approved' },
  { clinicName: 'City Family Health', owner: 'Dr. R. Das', city: 'Chennai', status: 'Under Review' },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} />
        ))}
      </section>

      <section className="rounded-none border border-emerald-100 bg-white p-4 shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-md sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Recent Clinics List</h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Total Clinics: 912
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Clinic Name</th>
                <th className="px-3 py-3">Owner Name</th>
                <th className="px-3 py-3">City</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentClinics.map((clinic) => (
                <tr className="border-b border-slate-100 text-slate-700" key={clinic.clinicName}>
                  <td className="px-3 py-3 font-medium">{clinic.clinicName}</td>
                  <td className="px-3 py-3">{clinic.owner}</td>
                  <td className="px-3 py-3">{clinic.city}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {clinic.status}
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

export { Dashboard };
