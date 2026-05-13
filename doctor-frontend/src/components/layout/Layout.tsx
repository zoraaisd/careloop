import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './Header';
import Sidebar from './Sidebar';
import { ChatSidebar } from '../chat/ChatSidebar';
import { getAuthSession } from '../../services/auth-storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [subscriptionAlert, setSubscriptionAlert] = useState<{ planName: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = React.useCallback(() => {
    setIsSidebarOpen(false);
  }, []);
  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((current) => !current);
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session?.token) return;

    const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:4001';
    const socket = io(socketUrl, {
      auth: { token: session.token },
      transports: ['websocket'],
    });

    socket.on('subscription_updated', (data: { planName: string }) => {
      setSubscriptionAlert(data);
      // Auto hide after 10 seconds
      setTimeout(() => setSubscriptionAlert(null), 10000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#e7ecea] text-[#1d3029] overflow-hidden">
      {/* Subscription Upgrade Alert */}
      {subscriptionAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] w-full max-w-md animate-bounce">
          <div className="mx-4 rounded-2xl bg-[#1d3029] p-4 text-white shadow-2xl border border-emerald-500/30 flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">Plan Upgraded!</h4>
              <p className="text-xs opacity-80">Your account is now active on the <span className="text-emerald-400 font-bold">{subscriptionAlert.planName}</span> plan.</p>
            </div>
            <button onClick={() => setSubscriptionAlert(null)} className="opacity-50 hover:opacity-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}
      <Sidebar isMobileOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          onToggleSidebar={toggleSidebar}
          onToggleChat={() => setIsChatOpen(!isChatOpen)} 
          unreadCount={unreadCount} 
        />
        <main className="flex-1 overflow-y-auto bg-[#e7ecea] p-3 pt-[80px] sm:p-4 sm:pt-[84px] lg:pt-4">
          <div className="mx-auto">
            {children}
          </div>
        </main>
      </div>
      <ChatSidebar 
        isOpen={isChatOpen} 
        setIsOpen={setIsChatOpen} 
        onUnreadChange={setUnreadCount} 
      />
    </div>
  );
};

export default Layout;
