import { useEffect, useState } from 'react';

import { formatMetricValue, formatNumber, getDashboard, getDoctorRequests, type DashboardResponse } from '@/services/admin';
import { StatCard } from '@/components/StatCard';

const Dashboard = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [pendingDoctorRequests, setPendingDoctorRequests] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardResponse, doctorRequests] = await Promise.all([
        getDashboard(),
        getDoctorRequests('pending'),
      ]);

      setData(dashboardResponse);
      setPendingDoctorRequests(doctorRequests.length);
    };

    void loadDashboard();
  }, []);

  const dashboardStats = data
    ? [
        { title: 'Total Doctors', value: formatNumber(data.summary.totalDoctors) },
        { title: 'Pending Doctor Requests', value: formatNumber(pendingDoctorRequests) },
        { title: 'Total Patients', value: formatNumber(data.summary.totalPatients) },
        { title: 'Active Subscriptions', value: formatNumber(data.summary.activeSubscriptions) },
        { title: 'Revenue Statistics', value: formatMetricValue(data.summary.revenueStatistics) },
        { title: 'WhatsApp Messages Sent', value: formatNumber(data.summary.whatsappMessagesSent) },
        { title: 'Total Number of Clinics', value: formatNumber(data.summary.totalClinics) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} />
        ))}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_14px_32px_-22px_rgba(22,163,74,0.5)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Recent Clinics List</h3>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Total Clinics:{' '}
            <span className="numeric-inline">{data ? formatNumber(data.summary.totalClinics) : '...'}</span>
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
              {(data?.recentClinics ?? []).map((clinic) => (
                <tr className="border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40" key={clinic.id}>
                  <td className="px-3 py-3 font-medium">{clinic.clinicName}</td>
                  <td className="px-3 py-3">{clinic.ownerName}</td>
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
