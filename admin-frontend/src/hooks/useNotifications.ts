import { useEffect, useState } from 'react';
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
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
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
        });
      });

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(items);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return { notifications, isLoading, refresh: fetchNotifications };
};
