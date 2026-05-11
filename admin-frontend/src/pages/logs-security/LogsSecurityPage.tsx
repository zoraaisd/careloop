import { useEffect, useMemo, useState } from 'react';
import {
  getDoctorDeletionLogs,
  getDoctorRequests,
  getPayments,
  getSupportTickets,
  type DoctorDeletionLog,
  type DoctorRequest,
  type PaymentRecord,
  type SupportTicket,
} from '@/services/admin';

type ActivityLog = {
  id: string;
  type: string;
  message: string;
  actor: string;
  timestamp: string;
  badgeClass: string;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getTicketType = (status: SupportTicket['status']) =>
  status === 'Open' ? 'RAISE TICKET' : 'CLOSE TICKET';

const BADGE_COLORS: Record<string, string> = {
  'RAISE TICKET': 'bg-blue-50 text-blue-700 border border-blue-200',
  'CLOSE TICKET': 'bg-red-50 text-red-700 border border-red-200',
  'SUBSCRIPTION PAYMENT': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  LOGIN: 'bg-slate-100 text-slate-700 border border-slate-200',
  'CREATE OWNER': 'bg-purple-50 text-purple-700 border border-purple-200',
  'DOCTOR REMOVED': 'bg-rose-50 text-rose-700 border border-rose-200',
};

const LogsSecurity = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRequest[]>([]);
  const [deletions, setDeletions] = useState<DoctorDeletionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const [ticketRes, paymentRes, doctorRes, deletionRes] = await Promise.all([
          getSupportTickets(),
          getPayments(),
          getDoctorRequests(),
          getDoctorDeletionLogs(),
        ]);
        setTickets(ticketRes);
        setPayments(paymentRes);
        setDoctors(doctorRes);
        setDeletions(deletionRes);
      } finally {
        setIsLoading(false);
      }
    };
    void loadLogs();
  }, []);

  const logs = useMemo<ActivityLog[]>(() => {
    const ticketLogs: ActivityLog[] = tickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      type: getTicketType(ticket.status),
      message: `Updated ticket ${ticket.id} to ${ticket.status.toUpperCase().replace(/\s+/g, '_')}`,
      actor: 'admin1@gmail.com',
      timestamp: ticket.createdDate,
      badgeClass: BADGE_COLORS[getTicketType(ticket.status)],
    }));

    const paymentLogs: ActivityLog[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: 'SUBSCRIPTION PAYMENT',
      message: `${payment.clinicName} paid Rs ${payment.amount} for ${payment.planName.toUpperCase()} subscription via UPI`,
      actor: payment.clinicName,
      timestamp: payment.paidOn,
      badgeClass: BADGE_COLORS['SUBSCRIPTION PAYMENT'],
    }));

    const userLogs: ActivityLog[] = doctors.map((doctor) => ({
      id: `doctor-${doctor.userId}`,
      type: doctor.subscriptionStatus === 'active' ? 'LOGIN' : 'CREATE OWNER',
      message:
        doctor.subscriptionStatus === 'active'
          ? `${doctor.clinicName || doctor.name} login`
          : `Created owner account for ${doctor.email} (INDEPENDENT, ${doctor.clinicId ? 2 : 1} branches)`,
      actor: doctor.email,
      timestamp: doctor.createdAt,
      badgeClass:
        BADGE_COLORS[doctor.subscriptionStatus === 'active' ? 'LOGIN' : 'CREATE OWNER'],
    }));

    const deletionLogs: ActivityLog[] = deletions.map((entry) => ({
      id: `doctor-removed-${entry.id}`,
      type: 'DOCTOR REMOVED',
      message: entry.message,
      actor: 'system',
      timestamp: entry.timestamp,
      badgeClass: BADGE_COLORS['DOCTOR REMOVED'],
    }));

    return [...ticketLogs, ...paymentLogs, ...userLogs, ...deletionLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [deletions, doctors, payments, tickets]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">Logs &amp; Security</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track all admin, user, ticket, and payment activity.
          </p>
        </div>

        {/* Log list */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Loading activity logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No activity logs found.
            </div>
          ) : (
            logs.map((log) => (
              <article
                key={log.id}
                className="flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50"
              >
                {/* Badge — fixed width so rows align */}
                <span
                  className={`mt-0.5 inline-flex h-fit w-36 flex-shrink-0 items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${log.badgeClass}`}
                >
                  {log.type}
                </span>

                {/* Message + actor — grows to fill remaining space */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{log.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">by {log.actor}</p>
                </div>

                {/* Timestamp — pinned to the right, never wraps */}
                <time className="flex-shrink-0 whitespace-nowrap text-xs text-slate-400">
                  {formatDateTime(log.timestamp)}
                </time>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export { LogsSecurity };
