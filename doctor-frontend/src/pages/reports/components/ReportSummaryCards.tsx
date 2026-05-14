import React from 'react';

import type { ReportMetric } from '../types';

type ReportSummaryCardsProps = {
  loading: boolean;
  metrics: ReportMetric[];
};

const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ loading, metrics }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {metrics.map((metric) => (
      <div
        key={metric.label}
        className="rounded-[22px] border border-[#dce4e0] bg-white p-4 shadow-[0_18px_35px_rgba(20,46,38,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(20,46,38,0.08)] sm:rounded-3xl sm:p-5 lg:rounded-[26px]"
      >
        <p className="text-sm font-medium text-[#607d74]">{metric.label}</p>
        <p className="mt-3 break-words text-[24px] font-bold leading-tight tracking-tight text-[#142e26] sm:mt-4 sm:text-[30px]">
          {loading ? '--' : metric.value}
        </p>
        {metric.helperText ? <p className="mt-3 text-sm leading-6 text-[#607d74]">{metric.helperText}</p> : null}
      </div>
    ))}
  </div>
);

export default ReportSummaryCards;
