type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  onClick?: () => void;
};

const StatCard = ({ title, value, description, onClick }: StatCardProps) => {
  return (
    <article 
      onClick={onClick}
      className={`rounded-[24px] border border-emerald-100/90 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fffc_100%)] p-5 shadow-[0_18px_40px_-30px_rgba(15,118,110,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_22px_50px_-32px_rgba(16,185,129,0.45)] ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400/50' : ''}`}
    >
      <p className="text-[0.95rem] font-medium text-slate-500">{title}</p>
      <p className="numeric-display mt-4 text-[2.05rem] font-semibold leading-none text-slate-950 sm:text-[2.2rem]">
        {value}
      </p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </article>
  );
};

export { StatCard };
