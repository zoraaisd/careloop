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
