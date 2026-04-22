type StatCardProps = {
  title: string;
  value: string;
  description?: string;
};

const StatCard = ({ title, value, description }: StatCardProps) => {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_30px_-18px_rgba(22,163,74,0.5)] sm:p-5">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </article>
  );
};

export { StatCard };
