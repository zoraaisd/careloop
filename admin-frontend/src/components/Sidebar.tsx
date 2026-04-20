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
  <div className="h-full overflow-y-auto border-r border-emerald-100 bg-white">
    <div className="px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Care Loop</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">Admin Panel</h1>
      <p className="mt-1 text-xs text-slate-500">Clinic SaaS Control Center</p>
    </div>

    <nav className="space-y-1 px-3 pb-6">
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            [
              'block rounded-md px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
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
