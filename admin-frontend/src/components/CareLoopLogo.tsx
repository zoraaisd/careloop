const CareLoopLogo = () => {
  return (
    <div className="flex items-center gap-3">
      <img
        alt="CareLoop logo"
        className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-green-500/20"
        src="/carelooplogo.png"
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Care Loop</p>
        <p className="text-sm font-semibold text-slate-900">Admin Workspace</p>
      </div>
    </div>
  );
};

export { CareLoopLogo };
