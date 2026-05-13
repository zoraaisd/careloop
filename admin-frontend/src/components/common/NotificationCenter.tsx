import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, CreditCard, HelpCircle, UserPlus, Clock } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    isLoading,
    hideNotification,
    clearAllNotifications,
  } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval': return <UserPlus className="h-4 w-4 text-emerald-600" />;
      case 'subscription': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'query': return <HelpCircle className="h-4 w-4 text-amber-600" />;
      default: return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const onClearNotifications = () => {
    clearAllNotifications();
  };

  const onNotificationClick = (notification: (typeof notifications)[number]) => {
    hideNotification(notification.id);
    setIsOpen(false);

    if (notification.navigationState) {
      navigate(notification.link, { state: notification.navigationState });
      return;
    }

    navigate(notification.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 shadow-sm"
      >
        <Bell className={`h-5 w-5 ${notifications.length > 0 ? 'animate-pulse' : ''}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xl ring-1 ring-black/5 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                {notifications.length} Pending
              </span>
              {notifications.length > 0 ? (
                <button
                  className="text-[11px] font-bold text-emerald-700 transition hover:text-emerald-800"
                  onClick={onClearNotifications}
                  type="button"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-height-[400px] overflow-y-auto divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                <p className="text-xs">Checking for updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-200" />
                <p className="text-sm font-medium text-slate-900">All caught up!</p>
                <p className="text-xs text-slate-500">No pending notifications at the moment.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNotificationClick(item)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-emerald-50/30"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-100">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.description}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 font-medium">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-3 bg-slate-50/50">
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full rounded-lg py-1.5 text-center text-xs font-bold text-emerald-700 hover:bg-emerald-100/50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { NotificationCenter };
