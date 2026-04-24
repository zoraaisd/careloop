const CareLoopLogo = () => {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#0F766E] text-lg font-bold text-white shadow-lg shadow-green-500/20">
        C
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Care Loop</p>
        <p className="text-sm font-semibold text-slate-900">Admin Workspace</p>
      </div>
    </div>
  );
};

export { CareLoopLogo };
