import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

const titleByPath: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/profile': 'Profile',
  '/admin/billing': 'Billing & Subscription',
  '/admin/clinics': 'Client / Clinic Section',
  '/admin/revenue': 'Revenue Statistics',
  '/admin/support': 'Support Issues',
};

const AdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = useMemo(() => titleByPath[location.pathname] ?? 'Admin Panel', [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="min-h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen flex-col lg:pl-72">
          <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export { AdminLayout };
