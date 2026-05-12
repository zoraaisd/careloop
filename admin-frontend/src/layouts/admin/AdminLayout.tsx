import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { AdminChatSidebar } from '@/components/chat/AdminChatSidebar';

const titleByPath: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users/all': 'All Users',
  '/admin/users/active': 'Active Users',
  '/admin/users/trial': 'Trial Users',
  '/admin/users/expired': 'Expired Users',
  '/admin/profile': 'Profile',
  '/admin/doctors': 'Doctor',
  '/admin/doctors/:doctorId': 'Doctor Details',
  '/admin/doctors/requests': 'Doctor Requests',
  '/admin/billing/subscription-plans': 'Subscription Plans',
  '/admin/billing/clinic-subscriptions': 'Clinic Subscriptions',
  '/admin/clinics/all': 'Clinic Management',
  '/admin/clinics/add': 'Add Clinic',
  '/admin/clinics/requests': 'Clinic Requests',
  '/admin/revenue': 'Revenue Statistics',
  '/admin/support': 'Support Tickets',
  '/admin/logs-security': 'Logs & Security',
};

const AdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = useMemo(() => titleByPath[location.pathname] ?? 'Admin Panel', [location.pathname]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="min-h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen flex-col lg:pl-64">
          <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 p-4 sm:p-6 lg:p-7">
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AdminChatSidebar />
    </div>
  );
};

export { AdminLayout };
