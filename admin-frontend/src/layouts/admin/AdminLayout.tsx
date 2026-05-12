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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
      <button
        aria-label="Open Support Chat"
        className={`fixed bottom-6 right-6 z-[2001] flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-[#1d3029] text-white shadow-[0_14px_32px_rgba(29,48,41,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#274238] hover:shadow-[0_18px_36px_rgba(29,48,41,0.45)] active:translate-y-0 ${isChatOpen ? 'ring-4 ring-emerald-200' : ''} animate-[floatBot_2.6s_ease-in-out_infinite]`}
        onClick={() => setIsChatOpen((current) => !current)}
        title="Open Support Chat"
        type="button"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      <AdminChatSidebar 
        isOpen={isChatOpen} 
        setIsOpen={setIsChatOpen} 
        onUnreadChange={setUnreadCount}
      />
    </div>
  );
};

export { AdminLayout };
