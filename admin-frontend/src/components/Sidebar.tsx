import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  IoChevronDown,
  IoChevronUp,
  IoClipboardOutline,
  IoDocumentTextOutline,
  IoGridOutline,
  IoHelpBuoyOutline,
  IoMedkitOutline,
  IoPersonCircleOutline,
  IoPulseOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';

import { CareLoopLogo } from '@/components/CareLoopLogo';
import { getDashboard } from '@/services/admin';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  icon: IconType;
  to?: string;
  key?: 'billing' | 'clinics' | 'clinicRequests';
  children?: { label: string; to: string; key?: string }[];
};

const SidebarContent = ({ onClose }: Pick<SidebarProps, 'onClose'>) => {
  const location = useLocation();
  const isBillingRoute = location.pathname.startsWith('/admin/billing');
  const isClinicRoute = location.pathname.startsWith('/admin/clinics');
  const [billingExpanded, setBillingExpanded] = useState(false);
  const [clinicExpanded, setClinicExpanded] = useState(false);
  const [pendingClinicCount, setPendingClinicCount] = useState(0);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const data = await getDashboard();
        setPendingClinicCount(data.summary.pendingClinicRequests);
      } catch (error) {
        console.error('Failed to load notification counts:', error);
      }
    };
    void loadCounts();
  }, []);

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: IoGridOutline },
    { label: 'Profile', to: '/admin/profile', icon: IoPersonCircleOutline },
    {
      label: 'Billing & Subscription',
      icon: IoClipboardOutline,
      key: 'billing',
      children: [
        { label: 'Subscription Plans', to: '/admin/billing/subscription-plans' },
        { label: 'Clinic Subscriptions', to: '/admin/billing/clinic-subscriptions' },
      ],
    },
    {
      label: 'Clinic Management',
      icon: IoPulseOutline,
      key: 'clinics',
      children: [
        { label: 'All Clinics', to: '/admin/clinics/all' },
        { label: 'Clinic Requests', to: '/admin/clinics/requests', key: 'clinicRequests' },
      ],
    },
    { label: 'Revenue Statistics', to: '/admin/revenue', icon: IoStatsChartOutline },
    { label: 'Doctor Requests', to: '/admin/doctors/requests', icon: IoDocumentTextOutline },
    { label: 'Support Issues', to: '/admin/support', icon: IoHelpBuoyOutline },
  ];

  const Badge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="h-full overflow-y-auto border-r border-emerald-100/90 bg-white/95 backdrop-blur">
      <div className="border-b border-emerald-100/80 px-4 py-5">
        <CareLoopLogo />
        <h1 className="mt-4 text-lg font-bold text-slate-900">Admin Panel</h1>
      </div>

      <nav className="space-y-1 px-2.5 py-4">
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const isOpen =
            item.key === 'billing'
              ? isBillingRoute || billingExpanded
              : isClinicRoute || clinicExpanded;
          const isSectionActive = item.key === 'billing' ? isBillingRoute : isClinicRoute;

          const getSectionBadgeCount = () => {
            if (item.key === 'clinics') return pendingClinicCount;
            return 0;
          };

          const sectionBadgeCount = getSectionBadgeCount();

          if (!item.children) {
            return (
              <NavLink
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200',
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-slate-900 hover:shadow-sm',
                  ].join(' ')
                }
                key={item.to}
                onClick={onClose}
                to={item.to ?? '/admin/dashboard'}
              >
                <ItemIcon className="text-base" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          }

          return (
            <div className="space-y-1" key={item.label}>
              <button
                className={[
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-200',
                  isSectionActive
                    ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-slate-900 hover:shadow-sm',
                ].join(' ')}
                onClick={() => {
                  if (item.key === 'billing') {
                    setBillingExpanded((prev) => !prev);
                  }
                  if (item.key === 'clinics') {
                    setClinicExpanded((prev) => !prev);
                  }
                }}
                type="button"
              >
                <ItemIcon className="text-base" />
                <span className="flex-1">{item.label}</span>
                <span className="ml-0.5 text-sm leading-none">
                  {isOpen ? <IoChevronUp /> : <IoChevronDown />}
                </span>
              </button>

              {isOpen ? (
                <div className="space-y-1 pl-8">
                  {item.children.map((child) => (
                    <NavLink
                      className={({ isActive }) =>
                        [
                          'flex items-center justify-between rounded-xl px-3 py-1.5 text-sm transition duration-200',
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'text-slate-600 hover:bg-emerald-50 hover:text-slate-900',
                        ].join(' ')
                      }
                      key={child.to}
                      onClick={onClose}
                      to={child.to}
                    >
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64">
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
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
};

export { Sidebar };
