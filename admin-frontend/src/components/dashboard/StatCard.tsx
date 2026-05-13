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
      {isHorizontal ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-4">
            {icon ? (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBgColor} ${iconColor} shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)]`}
              >
                {icon}
              </div>
            ) : null}
            <p className="text-[1.85rem] font-bold leading-none tracking-tight text-slate-950 tabular-nums">
              {value}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[1.05rem] font-semibold text-slate-800">{title}</p>

            {trend ? (
              <div className="mt-2 flex items-center gap-2">
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
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {icon ? (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBgColor} ${iconColor} shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)]`}
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-[1.05rem] font-medium text-slate-800">{title}</p>
            <p className="mt-2 text-[1.85rem] font-bold leading-none tracking-tight text-slate-950 tabular-nums">
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
      )}
    </article>
  );
};

export { StatCard };
