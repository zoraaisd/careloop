import { useCallback, useEffect, useState } from 'react';
import {
  getClinicRequests,
  getDoctorRequests,
  getPayments,
  getSupportTickets,
} from '@/services/admin';
import type { ClinicRequest, DoctorRequest, PaymentRecord, SupportTicket } from '@/services/admin';

export type NotificationItem = {
  id: string;
  type: 'approval' | 'subscription' | 'query';
  title: string;
  description: string;
  timestamp: string;
  link: string;
  navigationState?: Record<string, unknown>;
};

const HIDDEN_NOTIFICATIONS_STORAGE_KEY = 'careloop.admin.hidden-notifications';

const readHiddenNotificationIds = (): string[] => {
  try {
    const raw = window.localStorage.getItem(HIDDEN_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHiddenNotificationIds = (ids: string[]): void => {
  window.localStorage.setItem(HIDDEN_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(ids));
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [clinics, doctors, payments, tickets] = await Promise.all([
        getClinicRequests(),
        getDoctorRequests('pending'),
        getPayments(),
        getSupportTickets(),
      ]);

      const items: NotificationItem[] = [];

      // Add Clinic Requests
      clinics.filter(c => c.status === 'Pending').forEach(c => {
        items.push({
          id: `clinic-${c.id}`,
          type: 'approval',
          title: 'New Clinic Signup',
          description: `${c.clinic} is waiting for approval`,
          timestamp: c.requestedOn,
          link: '/admin/clinics/requests',
        });
      });

      // Add Doctor Requests
      doctors.filter(d => d.approvalStatus === 'pending').forEach(d => {
        items.push({
          id: `doctor-${d.userId}`,
          type: 'approval',
          title: 'New Doctor Request',
          description: `Dr. ${d.name} requested approval`,
          timestamp: d.createdAt,
          link: '/admin/doctors/requests',
        });
      });

      // Add Recent Subscriptions (last 48 hours for notification)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      payments.filter(p => new Date(p.paidOn) > twoDaysAgo).forEach(p => {
        items.push({
          id: `payment-${p.id}`,
          type: 'subscription',
          title: 'New Subscription',
          description: `${p.clinicName} subscribed to ${p.planName}`,
          timestamp: p.paidOn,
          link: '/admin/billing/clinic-subscriptions',
        });
      });

      // Add Open Support Tickets
      tickets.filter(t => t.status === 'Open').forEach(t => {
        items.push({
          id: `ticket-${t.id}`,
          type: 'query',
          title: 'New Support Query',
          description: t.issueTitle,
          timestamp: t.createdDate,
          link: '/admin/support',
          navigationState: { filter: 'Open' },
        });
      });

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const hiddenIds = new Set(readHiddenNotificationIds());
      const visibleItems = items.filter((item) => !hiddenIds.has(item.id));

      setNotifications(visibleItems);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hideNotification = useCallback((notificationId: string) => {
    const hiddenIds = new Set(readHiddenNotificationIds());
    hiddenIds.add(notificationId);
    writeHiddenNotificationIds(Array.from(hiddenIds));
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    if (notifications.length === 0) {
      return;
    }

    const hiddenIds = new Set(readHiddenNotificationIds());
    notifications.forEach((item) => hiddenIds.add(item.id));
    writeHiddenNotificationIds(Array.from(hiddenIds));
    setNotifications([]);
  }, [notifications]);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    refresh: fetchNotifications,
    hideNotification,
    clearAllNotifications,
  };
};
