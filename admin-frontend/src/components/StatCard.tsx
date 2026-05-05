import React from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isUp: boolean;
    label: string;
  };
  onClick?: () => void;
};

const StatCard = ({
  title,
  value,
  description,
  icon,
  iconBgColor = 'bg-emerald-50',
  iconColor = 'text-emerald-600',
  trend,
  onClick,
}: StatCardProps) => {
  return (
    <article
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgColor} ${iconColor}`}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <div
            className={`flex items-center gap-0.5 text-xs font-bold ${
              trend.isUp ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <span>{trend.isUp ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
          <span className="text-xs text-slate-400">{trend.label}</span>
        </div>
      )}

      {description && !trend && <p className="mt-4 text-xs text-slate-500">{description}</p>}
    </article>
  );
};

export { StatCard };
