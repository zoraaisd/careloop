import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, IndianRupee, RefreshCcw, TrendingUp, Users } from 'lucide-react';
import api from '@/services/api';

type ReportResponse = {
  summary: {
    newPatients: number;
    appointments: number;
    revenue: number;
    expenses: number;
    net: number;
    averageBilling: number;
  };
};

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDefaultRange = () => {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 29);

  return {
    dateFrom: getDateKey(from),
    dateTo: getDateKey(today),
  };
};

const emptyReport: ReportResponse = {
  summary: {
    newPatients: 0,
    appointments: 0,
    revenue: 0,
    expenses: 0,
    net: 0,
    averageBilling: 0,
  },
};

const Reports: React.FC = () => {
  const [filters, setFilters] = useState(createDefaultRange);
  const [report, setReport] = useState<ReportResponse>(emptyReport);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await api.get<ReportResponse>(
        `/doctor/reports?dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}`,
      );
      setReport(response.data ?? emptyReport);
    } catch (error) {
      console.error('Failed to fetch report data', error);
      setReport(emptyReport);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [filters.dateFrom, filters.dateTo]);

  const metrics = useMemo(
    () => [
      { label: 'New Patients', value: report.summary.newPatients, icon: Users, tone: 'bg-blue-50 text-blue-600' },
      { label: 'Appointments', value: report.summary.appointments, icon: CalendarDays, tone: 'bg-orange-50 text-orange-600' },
      { label: 'Revenue', value: `Rs. ${Math.round(report.summary.revenue).toLocaleString('en-IN')}`, icon: IndianRupee, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Average Billing', value: `Rs. ${Math.round(report.summary.averageBilling).toLocaleString('en-IN')}`, icon: TrendingUp, tone: 'bg-violet-50 text-violet-600' },
    ],
    [report],
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Reports</h1>
          <p className="text-sm text-[#607d74]">Review practice performance for the selected date range.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            className="rounded-xl border border-[#dce4e0] bg-white px-4 py-2 text-sm shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            className="rounded-xl border border-[#dce4e0] bg-white px-4 py-2 text-sm shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20"
          />
          <button
            type="button"
            onClick={() => void loadReport()}
            className="flex items-center gap-2 rounded-xl border border-[#dce4e0] bg-white px-4 py-2 text-sm font-semibold text-[#173a31] shadow-sm transition hover:bg-[#eef5f1]"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-[#dce4e0] bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#142e26]">{metric.value}</p>
            </div>
            <div className={`rounded-2xl p-3 ${metric.tone}`}>
              <metric.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-[#dce4e0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#eef7f1] p-3 text-[#16924d]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#142e26]">Performance Snapshot</h2>
              <p className="text-sm text-[#607d74]">Summary based on the current report range.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e5efea] bg-[#f8fbf9] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Revenue</p>
              <p className="mt-2 text-3xl font-bold text-[#142e26]">
                Rs. {Math.round(report.summary.revenue).toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-sm text-[#607d74]">Gross collections within the selected reporting window.</p>
            </div>
            <div className="rounded-2xl border border-[#e5efea] bg-[#f8fbf9] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Net Position</p>
              <p className={`mt-2 text-3xl font-bold ${report.summary.net >= 0 ? 'text-[#16924d]' : 'text-[#c24141]'}`}>
                Rs. {Math.round(report.summary.net).toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-sm text-[#607d74]">Revenue minus tracked expenses for this period.</p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#dce4e0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#142e26]">Report Notes</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[#f8fbf9] p-4">
              <p className="text-sm font-semibold text-[#173a31]">Current range</p>
              <p className="mt-1 text-sm text-[#607d74]">
                {new Date(filters.dateFrom).toLocaleDateString('en-IN')} to {new Date(filters.dateTo).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fbf9] p-4">
              <p className="text-sm font-semibold text-[#173a31]">Tracked expenses</p>
              <p className="mt-1 text-sm text-[#607d74]">
                Rs. {Math.round(report.summary.expenses).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fbf9] p-4">
              <p className="text-sm font-semibold text-[#173a31]">Status</p>
              <p className="mt-1 text-sm text-[#607d74]">
                {loading ? 'Refreshing report metrics...' : 'Report metrics are up to date for the selected range.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Reports;
