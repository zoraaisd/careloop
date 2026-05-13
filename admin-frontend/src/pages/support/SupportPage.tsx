import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Headphones, RefreshCw, XCircle } from 'lucide-react';

import { RespondModal } from '@/components/support/RespondModal';
import type { RespondPayload, SupportTicket } from '@/components/support/RespondModal';
import type { ResponseMethod } from '@/components/support/ResponseMethodSelector';
import {
  getSupportTickets,
  markSupportTicketOpened,
  respondToSupportTicket,
  type SupportTicket as ApiSupportTicket,
  type SupportTicketStatus,
} from '@/services/admin';

type StatusFilter = 'All' | SupportTicketStatus;

const parseSupportDescription = (ticket: ApiSupportTicket) => {
  const lines = String(ticket.description || '').split(/\r?\n/);
  const meta = {
    doctorName: '',
    phone: ticket.clinicPhone || '',
    email: ticket.clinicEmail || '',
  };
  const bodyLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^Doctor:/i.test(trimmed)) {
      meta.doctorName = trimmed.replace(/^Doctor:\s*/i, '');
      return;
    }
    if (/^Phone:/i.test(trimmed)) {
      meta.phone = trimmed.replace(/^Phone:\s*/i, '');
      return;
    }
    if (/^Email:/i.test(trimmed)) {
      meta.email = trimmed.replace(/^Email:\s*/i, '');
      return;
    }
    if (trimmed) {
      bodyLines.push(trimmed);
    }
  });

  return {
    ...meta,
    description: bodyLines.join('\n') || ticket.description || '-',
  };
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }

  return date.toLocaleDateString('en-IN');
};

const actionLabelByStatus: Record<SupportTicketStatus, string> = {
  Open: 'Respond',
  'In Progress': 'Respond',
  Resolved: 'Issue Closed',
  Closed: 'Issue Closed',
};

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'All' },
  { label: 'Open', value: 'Open' },
  { label: 'In_Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

const Support = () => {
  const location = useLocation();
  const [supportTickets, setSupportTickets] = useState<ApiSupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ApiSupportTicket | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ResponseMethod | null>(null);
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((location.state as any)?.filter || 'All');
  const [isLoading, setIsLoading] = useState(true);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      setSupportTickets(await getSupportTickets());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    const nextFilter = (location.state as { filter?: StatusFilter } | null)?.filter;
    if (nextFilter) {
      setStatusFilter(nextFilter);
    }
  }, [location.state]);

  const summary = useMemo(() => ({
    total: supportTickets.length,
    open: supportTickets.filter((ticket) => ticket.status === 'Open').length,
    inProgress: supportTickets.filter((ticket) => ticket.status === 'In Progress').length,
    resolved: supportTickets.filter((ticket) => ticket.status === 'Resolved').length,
  }), [supportTickets]);

  const filteredTickets = useMemo(
    () => supportTickets.filter((ticket) => statusFilter === 'All' || ticket.status === statusFilter),
    [statusFilter, supportTickets],
  );

  const closeModal = () => {
    setSelectedTicket(null);
    setSelectedMethod(null);
    setMessage('');
    setAttachedFile(null);
  };

  const handleSendResponse = async ({ method, message: responseMessage, attachedFile: file }: RespondPayload) => {
    if (!selectedTicket) {
      return;
    }

    try {
      await respondToSupportTicket(selectedTicket.id, {
        method,
        message: responseMessage,
        attachmentName: file?.name,
        attachmentFile: file,
      });

      await loadTickets();
      closeModal();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.debug?.message ||
        'Failed to send response. Please try again.';
      alert(message);
    }
  };

  const handleOpenTicket = async (ticket: ApiSupportTicket) => {
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return;
    }

    setSelectedTicket(ticket);

    if (ticket.status !== 'Open') {
      return;
    }

    const updatedTicket = await markSupportTicketOpened(ticket.id);
    setSelectedTicket(updatedTicket);
    setSupportTickets((current) => current.map((item) => (item.id === updatedTicket.id ? updatedTicket : item)));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Support Tickets</h1>
            <p className="mt-1 text-sm text-slate-500">Manage and resolve customer support issues</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => void loadTickets()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Tickets</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{summary.total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Headphones className="h-5 w-5" />
            </div>
          </article>
          <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Open</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{summary.open}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Headphones className="h-5 w-5" />
            </div>
          </article>
          <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">In Progress</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{summary.inProgress}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </article>
          <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Resolved</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.resolved}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </article>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
            {statusFilterOptions.map((status) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase transition ${
                  statusFilter === status.value
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                type="button"
              >
                {status.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Ticket Issue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      Loading support tickets...
                    </td>
                  </tr>
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                    const details = parseSupportDescription(ticket);
                    const isFinal = ticket.status === 'Resolved' || ticket.status === 'Closed';

                    return (
                      <tr
                        className="align-top border-b border-slate-100 text-slate-800 transition hover:bg-emerald-50/40"
                        key={ticket.id}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{ticket.clinicName || '-'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{details.email || ticket.clinicEmail || '-'}</p>
                        </td>
                        <td className="px-4 py-4 font-medium">{ticket.issueTitle || '-'}</td>
                        <td className="px-4 py-4">{ticket.status || '-'}</td>
                        <td className="numeric-inline px-4 py-4">{formatDate(ticket.createdDate)}</td>
                        <td className="px-4 py-4">
                          <button
                            className={`text-sm font-medium transition ${
                              isFinal
                                ? 'cursor-not-allowed text-slate-400'
                                : 'text-emerald-700 hover:text-emerald-800'
                            }`}
                            disabled={isFinal}
                            onClick={() => void handleOpenTicket(ticket)}
                            type="button"
                          >
                            {actionLabelByStatus[ticket.status]}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      No support tickets match this status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <RespondModal
        attachedFile={attachedFile}
        isOpen={Boolean(selectedTicket)}
        message={message}
        onClose={closeModal}
        onFileChange={setAttachedFile}
        onMessageChange={setMessage}
        onMethodChange={setSelectedMethod}
        onSend={handleSendResponse}
        selectedMethod={selectedMethod}
        ticket={selectedTicket as SupportTicket | null}
      />
    </>
  );
};

export { Support };
