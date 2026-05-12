import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '@/services/auth-storage';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { getAdminProfile } from '@/services/admin';

type NavbarProps = {
  title: string;
  onMenuClick: () => void;
  onToggleChat?: () => void;
  unreadCount?: number;
};

const Navbar = ({ title, onMenuClick, onToggleChat, unreadCount = 0 }: NavbarProps) => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getAdminProfile();
        setAdminName(profile.adminName ?? '');
        setProfileImageUrl(profile.profileImageUrl || null);
      } catch {
        setAdminName('');
        setProfileImageUrl(null);
      }
    };

    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ adminName?: string; profileImageUrl?: string | null }>;
      if (typeof customEvent.detail?.adminName === 'string') {
        setAdminName(customEvent.detail.adminName);
      }
      if (customEvent.detail && 'profileImageUrl' in customEvent.detail) {
        setProfileImageUrl(customEvent.detail.profileImageUrl ?? null);
      }
    };

    void loadProfile();
    window.addEventListener('admin-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('admin-profile-updated', handleProfileUpdate);
  }, []);

  const adminInitials = useMemo(() => {
    const parts = adminName
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, [adminName]);

  const handleSignOut = () => {
    clearAuthSession();
    window.location.replace('/admin/login');
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
          {onToggleChat && (
            <button 
              onClick={onToggleChat}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-700 transition-all hover:bg-emerald-50 hover:border-emerald-300 hover:scale-105 active:scale-95 group shadow-sm"
              title="Open Support Chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-emerald-600 transition-colors">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <NotificationCenter />
          <button
            className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
            onClick={handleSignOut}
            type="button"
          >
            Sign Out
          </button>
          <button
            aria-label="Open profile"
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            onClick={() => navigate('/admin/profile')}
            type="button"
          >
            {profileImageUrl ? (
              <img
                alt="Admin profile"
                className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-emerald-100 ring-offset-2"
                src={profileImageUrl}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm ring-2 ring-emerald-100 ring-offset-2">
                {adminInitials}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
