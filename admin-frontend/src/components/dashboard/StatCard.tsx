import React from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  layout?: 'vertical' | 'horizontal';
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
  layout = 'vertical',
  trend,
  onClick,
}: StatCardProps) => {
  const isHorizontal = layout === 'horizontal';

  return (
    <article
      onClick={onClick}
      className={`relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_24px_55px_-34px_rgba(15,23,42,0.35)] ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className={`flex ${isHorizontal ? 'items-start gap-3.5' : 'flex-col gap-4'}`}>
        {icon ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBgColor} ${iconColor} shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)]`}
          >
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <p
            className={`text-slate-800 ${
              isHorizontal ? 'pt-0.5 text-[1.05rem] font-semibold' : 'text-[1.05rem] font-medium'
            }`}
          >
            {title}
          </p>

          <p
            className={`text-slate-950 ${
              isHorizontal ? 'mt-5 text-[2.5rem] font-bold leading-none' : 'mt-2 text-[2.85rem] font-bold leading-none'
            }`}
          >
            {value}
          </p>

          {trend ? (
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  trend.isUp ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                <span>{trend.isUp ? '↑' : '↓'}</span>
                <span>{trend.value}</span>
              </div>
              <span className="text-sm text-slate-400">{trend.label}</span>
            </div>
          ) : null}

          {description && !trend ? (
            <p className="mt-4 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export { StatCard };
