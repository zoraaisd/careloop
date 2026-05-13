import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Calendar,
  FileText,
  MessageSquare,
  CreditCard,
  Package,
  Activity,
  Settings,
  Ticket,
  Truck,
  ChartColumn,
  ClipboardList,
  ChevronDown,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
  onNavigate?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, compact = false, onNavigate }) => {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'flex items-center border-l-2 text-[14px] font-medium transition-colors',
          compact ? 'gap-2 px-2 py-2' : 'gap-2.5 px-3 py-2',
          isActive
            ? 'bg-[#c8e8d2] text-[#13804e] border-[#8ac7a2]'
            : 'text-[#32534a] hover:bg-[#eef5f1] hover:text-[#173a31] border-transparent'
        )
      }
    >
      <span className="text-[#43685e]">{icon}</span>
      {label}
    </NavLink>
  );
};

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const location = useLocation();
  const [isSuppliersOpen, setIsSuppliersOpen] = React.useState(() => location.pathname.startsWith('/suppliers'));

  React.useEffect(() => {
    if (location.pathname.startsWith('/suppliers')) {
      setIsSuppliersOpen(true);
    }
    onClose();
  }, [location.pathname, onClose]);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-[#11241d]/45 transition-opacity lg:hidden',
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] max-w-[84vw] flex-col overflow-hidden border-r border-[#bfd0c8] bg-[#f4f8f6] shadow-[0_24px_60px_rgba(17,36,29,0.18)] transition-transform duration-300 lg:static lg:z-auto lg:w-[216px] lg:max-w-none lg:translate-x-0 lg:shadow-none',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
      <div className="h-[72px] flex items-center justify-between px-5 border-b border-[#bfd0c8] flex-shrink-0 bg-[#f4f8f6]">
        <img alt="CareLoop" className="h-12 w-auto object-contain" src="/mainlogo.png" />
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6e4dd] bg-white text-[#173a31] transition hover:bg-[#eef5f1] lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 py-5 space-y-7 overflow-y-auto [overflow-anchor:none]">
        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Main</h3>
          <div className="space-y-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onNavigate={onClose} />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Clinical</h3>
          <div className="space-y-1">
            <NavItem to="/patients" icon={<Users className="w-4 h-4" />} label="Patients" onNavigate={onClose} />
            <NavItem to="/clinic" icon={<Building2 className="w-4 h-4" />} label="Clinic" onNavigate={onClose} />
            <NavItem to="/appointments" icon={<CalendarDays className="w-4 h-4" />} label="Appointments" onNavigate={onClose} />
            <NavItem to="/calendar" icon={<Calendar className="w-4 h-4" />} label="Calendar" onNavigate={onClose} />
            <NavItem to="/prescriptions" icon={<FileText className="w-4 h-4" />} label="Prescriptions" onNavigate={onClose} />
            <NavItem to="/chat" icon={<MessageSquare className="w-4 h-4" />} label="Chat" onNavigate={onClose} />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Management</h3>
          <div className="space-y-1">
            <NavItem to="/subscription" icon={<CreditCard className="w-4 h-4" />} label="Subscription" onNavigate={onClose} />
            <NavItem to="/inventory" icon={<Package className="w-4 h-4" />} label="Inventory Mgmt" onNavigate={onClose} />
            <div>
              <NavLink
                to="/suppliers"
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium transition-colors border-l-2',
                    isActive
                      ? 'bg-[#c8e8d2] text-[#13804e] border-[#8ac7a2]'
                      : 'text-[#32534a] hover:bg-[#eef5f1] hover:text-[#173a31] border-transparent',
                  )
                }
              >
                <span className="text-[#43685e]"><Truck className="w-4 h-4" /></span>
                <span className="flex-1">Suppliers</span>
                <button
                  aria-label={isSuppliersOpen ? 'Close suppliers menu' : 'Open suppliers menu'}
                  className="rounded p-1 hover:bg-white/50"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsSuppliersOpen((current) => !current);
                  }}
                  type="button"
                >
                  <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', isSuppliersOpen ? 'rotate-180' : 'rotate-0')} />
                </button>
              </NavLink>
              {isSuppliersOpen ? (
                <div className="ml-2 mt-1 space-y-1 border-l border-[#d6e4dd] pl-1">
                  <NavItem compact to="/suppliers/purchase-orders" icon={<ClipboardList className="w-3.5 h-3.5" />} label="Purchase Entry" onNavigate={onClose} />
                  <NavItem compact to="/suppliers/invoices" icon={<CreditCard className="w-3.5 h-3.5" />} label="Invoices & Payments" onNavigate={onClose} />
                </div>
              ) : null}
            </div>
            <NavItem to="/activities" icon={<Activity className="w-4 h-4" />} label="Activities & Expenses" onNavigate={onClose} />
            <NavItem to="/reports" icon={<ChartColumn className="w-4 h-4" />} label="Reports" onNavigate={onClose} />
            <NavItem to="/automation" icon={<Settings className="w-4 h-4" />} label="Automation" onNavigate={onClose} />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Account</h3>
          <div className="space-y-1">
            <NavItem to="/ticket" icon={<Ticket className="w-4 h-4" />} label="Raise Ticket" onNavigate={onClose} />
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
