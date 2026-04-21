import { ClinicRevenueDistributionChart, RevenueTrendChart } from '@/components/Charts';
import { StatCard } from '@/components/StatCard';

const revenueStats = [
  { title: 'Monthly Revenue', value: '$20.8K' },
  { title: 'Yearly Revenue', value: '$100.3K' },
  { title: 'Subscription Growth', value: '+14.2%' },
  { title: 'Clinic Revenue Distribution', value: 'Enterprise 45%' },
];

const Revenue = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_12px_28px_-20px_rgba(22,163,74,0.45)]">
        <h3 className="text-lg font-semibold text-slate-900">Revenue Statistics</h3>
        <p className="mt-1 text-sm text-slate-500">
          Monitor growth trends, distribution across plans, and overall income performance.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {revenueStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RevenueTrendChart />
        <ClinicRevenueDistributionChart />
      </section>
    </div>
  );
};

export { Revenue };
