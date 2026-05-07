import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '@/services/auth-storage';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { getAdminProfile } from '@/services/admin';

const LOCAL_ADMIN_PROFILE_IMAGE_KEY = 'admin.profile.localImageDataUrl';

type NavbarProps = {
  title: string;
  onMenuClick: () => void;
};

const Navbar = ({ title, onMenuClick }: NavbarProps) => {
  const navigate = useNavigate();
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';
  const [adminName, setAdminName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getAdminProfile();
        const localImage = window.localStorage.getItem(LOCAL_ADMIN_PROFILE_IMAGE_KEY);
        setAdminName(profile.adminName ?? '');
        setProfileImageUrl(localImage || profile.profileImageUrl || null);
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
