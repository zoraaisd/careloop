import React from 'react';
import { useLocation } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '@/services/auth-storage';
import { getDoctorAccessState, type DoctorAccessState } from '@/services/doctor-access';
import { clearDoctorSession } from '@/services/session';

const resolveAssetUrl = (value: string) => {
  if (!value) {
    return '';
  }

  if (/^(https?:\/\/|data:)/i.test(value)) {
    return value;
  }

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:4001/api';

  const apiOrigin = new URL(apiBaseUrl).origin;
  return value.startsWith('/') ? `${apiOrigin}${value}` : `${apiOrigin}/${value}`;
};

const Header: React.FC = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const hiddenTitleRoutes = new Set(['/clinic/add-doctor']);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState<DoctorAccessState | null>(null);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const session = getAuthSession();
  
  const title = hiddenTitleRoutes.has(location.pathname)
    ? ''
    : pathParts.length > 0
      ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1).replace('-', ' ')
      : 'Dashboard';

  React.useEffect(() => {
    const storedClinicProfile = window.localStorage.getItem('careloop.clinic.profile');

    if (storedClinicProfile) {
      try {
        const parsed = JSON.parse(storedClinicProfile) as Partial<DoctorAccessState>;
        setProfileData((current) => ({
          ...(current ?? {
            approvalStatus: 'approved',
            subscriptionStatus: 'active',
            trialStartedAt: null,
            trialEndsAt: null,
            accessState: 'active',
            canAccessPortal: true,
            canAppearPublicly: true,
            hasActiveTrial: false,
            message: '',
          }),
          ...parsed,
        }));
      } catch {
        window.localStorage.removeItem('careloop.clinic.profile');
      }
    }

    const loadProfile = async () => {
      try {
        const response = await getDoctorAccessState();
        setProfileData(response);
      } catch {
        setProfileData(null);
      }
    };

    void loadProfile();
  }, []);

  React.useEffect(() => {
    const handleClinicMediaUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        clinicImageUrl?: string | null;
        clinicName?: string | null;
        clinicPhone?: string | null;
      }>;
      const nextProfileFields = {
        clinicImageUrl: customEvent.detail?.clinicImageUrl ?? null,
        clinicName: customEvent.detail?.clinicName,
        clinicPhone: customEvent.detail?.clinicPhone,
      };

      setProfileData((current) => {
        if (!current) {
          return current;
        }

        const nextState = {
          ...current,
          clinicImageUrl: nextProfileFields.clinicImageUrl,
          clinicName: nextProfileFields.clinicName ?? current.clinicName,
          clinicPhone: nextProfileFields.clinicPhone ?? current.clinicPhone,
        };
        window.localStorage.setItem('careloop.clinic.profile', JSON.stringify(nextState));
        return nextState;
      });
    };

    window.addEventListener('clinic-media-updated', handleClinicMediaUpdated as EventListener);
    return () => window.removeEventListener('clinic-media-updated', handleClinicMediaUpdated as EventListener);
  }, []);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const clinicName = profileData?.clinicName || 'Clinic not available';
  const clinicPhone = profileData?.clinicPhone || 'Not available';
  const clinicImageUrl = profileData?.clinicImageUrl ? resolveAssetUrl(profileData.clinicImageUrl) : '';
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';
  const profileInitials = (profileData?.doctorName || session?.name || 'Doctor User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleLogout = () => {
    clearAuthSession();
    clearDoctorSession();
    setIsProfileOpen(false);
    window.location.assign(`${authAppUrl}/login`);
  };

  return (
    <header className="h-[68px] border-b border-[#bfd0c8] bg-[#f4f8f6] px-6 flex items-center justify-between shrink-0">
      <h1 className="text-[24px] font-semibold text-[#122b23] leading-none">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="h-10 px-6 rounded-full bg-[#1ba751] text-white text-[12px] font-semibold inline-flex items-center">
          Active
        </span>
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#bfd0c8] bg-[#1d7d4f] text-sm font-semibold text-white"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            {clinicImageUrl ? (
              <img
                alt={clinicName}
                className="h-full w-full object-cover"
                src={clinicImageUrl}
              />
            ) : (
              profileInitials || 'DU'
            )}
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-14 z-20 w-64 rounded-2xl border border-[#d9e5df] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#88a097]">Profile</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#7b8f87]">Clinic Name</p>
                  <p className="mt-1 text-sm font-semibold text-[#183229]">{clinicName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7b8f87]">Clinic Mobile Number</p>
                  <p className="mt-1 text-sm font-semibold text-[#183229]">{clinicPhone}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[#e5efea] pt-4">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-xl border border-[#e4c7c7] px-4 py-2.5 text-sm font-semibold text-[#c24141] transition hover:bg-[#fff5f5]"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
