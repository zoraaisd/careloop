import { clearAuthSession } from '@/services/auth-storage';

type NavbarProps = {
  title: string;
  onMenuClick: () => void;
};

const Navbar = ({ title, onMenuClick }: NavbarProps) => {
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

  const handleSignOut = () => {
    clearAuthSession();
    window.location.assign(`${authAppUrl}/login`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <span className="text-sm font-bold tracking-tight">|||</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
            <p className="text-xs text-slate-500">Clinic operations and analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
            System Healthy
          </span>
          <button
            className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
            onClick={handleSignOut}
            type="button"
          >
            Sign Out
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
