import { useEffect, useState } from 'react';

import { ClinicRevenueDistributionChart, RevenueTrendChart } from '@/components/Charts';
import { StatCard } from '@/components/StatCard';
import { formatMetricValue, getRevenue, type RevenueResponse } from '@/services/admin';

const Revenue = () => {
  const [data, setData] = useState<RevenueResponse | null>(null);

  useEffect(() => {
    void (async () => {
      setData(await getRevenue());
    })();
  }, []);

  const revenueStats = data
    ? [
        { title: 'Monthly Revenue', value: formatMetricValue(data.overview.monthlyRevenue) },
        { title: 'Yearly Revenue', value: formatMetricValue(data.overview.yearlyRevenue) },
        { title: 'Subscription Growth', value: formatMetricValue(data.overview.subscriptionGrowth) },
        { title: 'Clinic Revenue Distribution', value: formatMetricValue(data.overview.clinicRevenueDistribution) },
      ]
    : [];

  return (
    <div className="space-y-6">
      
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {revenueStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RevenueTrendChart data={data?.revenueTrend ?? []} />
        <ClinicRevenueDistributionChart data={data?.clinicRevenueDistribution ?? []} />
      </section>
    </div>
  );
};

export { Revenue };
