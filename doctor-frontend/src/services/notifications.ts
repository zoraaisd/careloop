const NOTIFICATION_STORAGE_KEY = 'careloop.notifications';
const NOTIFICATION_EVENT = 'careloop-notifications-changed';

export type AppointmentNotification = {
  id: string;
  type: 'appointment';
  title: string;
  subtitle: string;
  date: string;
  time: string;
  status: string;
  targetPath: string;
  read: boolean;
  hidden: boolean;
  updatedAt: number;
};

type NotificationStore = {
  items: AppointmentNotification[];
};

const readStore = (): NotificationStore => {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return { items: [] };
    }

    const parsed = JSON.parse(raw) as NotificationStore;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
};

const writeStore = (store: NotificationStore): void => {
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
};

export const syncAppointmentNotifications = (
  appointments: Array<{
    appointmentId: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    status: string;
  }>,
): AppointmentNotification[] => {
  const store = readStore();
  const previousItems = new Map(store.items.map((item) => [item.id, item]));

  const items = appointments.map((appointment) => {
    const existing = previousItems.get(appointment.appointmentId);

    return {
      id: appointment.appointmentId,
      type: 'appointment' as const,
      title: appointment.patientName,
      subtitle: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      targetPath: '/appointments',
      read: existing?.read ?? false,
      hidden: existing?.hidden ?? false,
      updatedAt: Date.now(),
    };
  });

  writeStore({ items });
  return items;
};

export const getVisibleNotifications = (): AppointmentNotification[] => {
  return readStore().items.filter((item) => !item.hidden);
};

export const getUnreadNotificationCount = (): number => {
  return getVisibleNotifications().filter((item) => !item.read).length;
};

export const clearAllNotifications = (): void => {
  const store = readStore();
  writeStore({
    items: store.items.map((item) => ({
      ...item,
      hidden: true,
      read: true,
    })),
  });
};

export const handleNotificationClick = (notificationId: string): void => {
  const store = readStore();
  writeStore({
    items: store.items.map((item) =>
      item.id === notificationId
        ? {
            ...item,
            hidden: true,
            read: true,
          }
        : item,
    ),
  });
};

export const subscribeToNotifications = (callback: () => void): (() => void) => {
  const listener = () => callback();
  const storageListener = (event: StorageEvent) => {
    if (event.key === NOTIFICATION_STORAGE_KEY || event.key === null) {
      callback();
    }
  };

  window.addEventListener(NOTIFICATION_EVENT, listener as EventListener);
  window.addEventListener('storage', storageListener);

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT, listener as EventListener);
    window.removeEventListener('storage', storageListener);
  };
};
