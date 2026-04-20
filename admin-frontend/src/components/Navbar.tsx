type NavbarProps = {
  title: string;
  onMenuClick: () => void;
};

const Navbar = ({ title, onMenuClick }: NavbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 text-emerald-700 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <span className="text-lg">≡</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
            <p className="text-xs text-slate-500">Clinic operations and analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
            System Healthy
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
