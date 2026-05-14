import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import api from '@/services/api';
import { clearAuthSession, getAuthSession } from '@/services/auth-storage';
import { getDoctorAccessState, type DoctorAccessState } from '@/services/doctor-access';
import { subscribeToDashboardRefresh } from '@/services/dashboard-refresh';
import {
  clearAllNotifications,
  getUnreadNotificationCount,
  getVisibleNotifications,
  handleNotificationClick,
  subscribeToNotifications,
  syncAppointmentNotifications,
  type AppointmentNotification,
} from '@/services/notifications';
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

type HeaderAppointment = {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
};

type AppointmentListResponse = {
  total: number;
  items: HeaderAppointment[];
};

const toDateInputValue = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value: string): string => {
  if (!value) return '';
  if (/^\d{2}:\d{2}$/.test(value)) return value;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';

  const [, rawHour, minutes, period] = match;
  let hour = Number(rawHour);

  if (period.toUpperCase() === 'AM') {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return `${String(hour).padStart(2, '0')}:${minutes}`;
};

const parseAppointmentDateTime = (date: string, time: string): Date | null => {
  const normalizedDate = toDateInputValue(date);
  const normalizedTime = toTimeInputValue(time);
  if (!normalizedDate || !normalizedTime) return null;

  const parsed = new Date(`${normalizedDate}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAppointmentTime = (value: string) => {
  const normalized = toTimeInputValue(value);
  if (!normalized) return value;

  const [hourText, minuteText] = normalized.split(':');
  const rawHour = Number(hourText);
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 || 12;
  return `${hour12}:${minuteText} ${period}`;
};

interface HeaderProps {
  onToggleChat?: () => void;
  onToggleSidebar?: () => void;
  unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat, unreadCount = 0, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const hiddenTitleRoutes = new Set(['/clinic/add-doctor']);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState<DoctorAccessState | null>(null);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const notificationsRef = React.useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = React.useState<AppointmentNotification[]>(() => getVisibleNotifications());
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(() => getUnreadNotificationCount());
  const session = getAuthSession();
  
  const title = hiddenTitleRoutes.has(location.pathname)
    ? ''
    : pathParts.length > 0
      ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1).replace('-', ' ')
      : 'Dashboard';

  React.useEffect(() => {
    let isMounted = true;
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

    const loadTodaysAppointments = async () => {
      try {
        const response = await api.get<AppointmentListResponse | HeaderAppointment[]>('/doctor/appointments');
        const payload = Array.isArray(response.data) ? response.data : response.data?.items ?? [];
        const today = new Date();

        const nextAppointments = payload
          .map((appointment) => ({
            ...appointment,
            appointmentAt: parseAppointmentDateTime(appointment.date, appointment.time),
          }))
          .filter((appointment) => appointment.appointmentAt && appointment.appointmentAt.toDateString() === today.toDateString())
          .sort((left, right) => left.appointmentAt!.getTime() - right.appointmentAt!.getTime())
          .map(({ appointmentAt: _appointmentAt, ...appointment }) => appointment);

        syncAppointmentNotifications(nextAppointments);

        if (isMounted) {
          setNotifications(getVisibleNotifications());
          setUnreadNotificationCount(getUnreadNotificationCount());
        }
      } catch {
        if (isMounted) {
          syncAppointmentNotifications([]);
          setNotifications(getVisibleNotifications());
          setUnreadNotificationCount(getUnreadNotificationCount());
        }
      }
    };

    void loadProfile();
    void loadTodaysAppointments();

    const unsubscribe = subscribeToDashboardRefresh(() => {
      void loadTodaysAppointments();
    });

    const handleWindowFocus = () => {
      void loadTodaysAppointments();
    };

    const unsubscribeNotifications = subscribeToNotifications(() => {
      if (!isMounted) {
        return;
      }

      setNotifications(getVisibleNotifications());
      setUnreadNotificationCount(getUnreadNotificationCount());
    });

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeNotifications();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  React.useEffect(() => {
    const handleClinicMediaUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        clinicImageUrl?: string | null;
        clinicLogoUrl?: string | null;
        clinicName?: string | null;
        clinicPhone?: string | null;
      }>;
      const nextProfileFields = {
        clinicImageUrl: customEvent.detail?.clinicImageUrl ?? null,
        clinicLogoUrl: customEvent.detail?.clinicLogoUrl ?? null,
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
          clinicLogoUrl: nextProfileFields.clinicLogoUrl,
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

      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const clinicName = profileData?.clinicName || 'Clinic not available';
  const clinicPhone = profileData?.clinicPhone || 'Not available';
  const clinicAvatarUrl = profileData?.clinicLogoUrl
    ? resolveAssetUrl(profileData.clinicLogoUrl)
    : profileData?.clinicImageUrl
      ? resolveAssetUrl(profileData.clinicImageUrl)
      : '';
  const profileInitials = (profileData?.doctorName || session?.name || 'Doctor User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleLogout = () => {
    clearAuthSession();
    clearDoctorSession();
    window.localStorage.removeItem('careloop.clinic.profile');
    setIsProfileOpen(false);
    window.location.replace('/login');
  };

  const onClearNotifications = () => {
    clearAllNotifications();
  };

  const onNotificationClick = (notification: AppointmentNotification) => {
    handleNotificationClick(notification.id);
    setIsNotificationsOpen(false);
    navigate(notification.targetPath);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-[#bfd0c8] bg-[#f4f8f6] px-4 sm:px-6 lg:relative">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="relative z-40 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#bfd0c8] bg-white text-[#1d3029] transition hover:bg-[#f4faf7] lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <h1 className="truncate text-[22px] sm:text-[24px] font-semibold text-[#122b23] leading-none">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {onToggleChat && (
          <button 
            onClick={onToggleChat}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-[#bfd0c8] bg-white text-[#1d3029] shadow-sm transition-all hover:scale-105 hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 sm:h-11 sm:w-11"
            title="Open Support Chat"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-emerald-600 transition-colors">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#bfd0c8] bg-white text-[#375446] transition hover:bg-[#f4faf7] sm:h-11 sm:w-11"
            onClick={() => setIsNotificationsOpen((current) => !current)}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unreadNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                {unreadNotificationCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 top-14 z-20 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-[#d9e5df] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#88a097]">Notifications</p>
                  <p className="mt-1 text-sm font-semibold text-[#183229]">Today's appointments</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ecf8f1] px-2.5 py-1 text-[11px] font-semibold text-[#16924d]">
                    {notifications.length}
                  </span>
                  {notifications.length > 0 ? (
                    <button
                      className="cursor-pointer text-[11px] font-semibold text-[#16924d] transition hover:text-[#11733d]"
                      onClick={onClearNotifications}
                      type="button"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="w-full cursor-pointer rounded-2xl border border-[#e3eee8] bg-[#f8fbf9] px-3 py-3 text-left transition hover:border-[#cfe3d7] hover:bg-[#f4faf7]"
                      onClick={() => onNotificationClick(notification)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#153127]">{notification.title}</p>
                          <p className="mt-1 text-xs font-medium text-[#6e847c]">{notification.subtitle}</p>
                        </div>
                        <span className="rounded-full bg-[#e9f7ef] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#14854a]">
                          {notification.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-[#2f4b40]">
                        {formatAppointmentTime(notification.time)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d7e3dc] bg-[#f8fbf9] px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-[#27453a]">No appointments today</p>
                    <p className="mt-1 text-xs text-[#799086]">Today's schedule will show up here.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#bfd0c8] bg-[#1d7d4f] text-sm font-semibold text-white sm:h-11 sm:w-11"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            {clinicAvatarUrl ? (
              <img
                alt={clinicName}
                className="h-full w-full object-cover"
                src={clinicAvatarUrl}
              />
            ) : (
              profileInitials || 'DU'
            )}
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-14 z-20 w-[min(256px,calc(100vw-2rem))] rounded-2xl border border-[#d9e5df] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
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
