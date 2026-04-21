import { NavLink } from 'react-router-dom';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  to: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Profile', to: '/admin/profile' },
  { label: 'Billing & Subscription', to: '/admin/billing' },
  { label: 'Client / Clinic Section', to: '/admin/clinics' },
  { label: 'Revenue Statistics', to: '/admin/revenue' },
  { label: 'Support Issues', to: '/admin/support' },
];

const SidebarContent = ({ onClose }: Pick<SidebarProps, 'onClose'>) => (
  <div className="h-full overflow-y-auto border-r border-emerald-100/90 bg-white/95 backdrop-blur">
    <div className="border-b border-emerald-100/80 px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Care Loop</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">Admin Panel</h1>
      <p className="mt-1 text-xs text-slate-500">Clinic SaaS Control Center</p>
    </div>

    <nav className="space-y-1.5 px-3 py-5">
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            [
              'block rounded-x1 px-3.5 py-2.5 text-sm font-medium transition duration-200',
              isActive
                ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-slate-900 hover:shadow-sm',
            ].join(' ')
          }
          key={item.to}
          onClick={onClose}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </div>
);

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72">
        <SidebarContent onClose={onClose} />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-900/35"
            onClick={onClose}
            type="button"
          />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
};

export { Sidebar, navItems };
