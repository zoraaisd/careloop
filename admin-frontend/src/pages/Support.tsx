import { useEffect, useState } from 'react';

import { RespondModal } from '@/components/RespondModal';
import type { RespondPayload, SupportTicket } from '@/components/RespondModal';
import type { ResponseMethod } from '@/components/ResponseMethodSelector';
import { getSupportTickets, respondToSupportTicket, type SupportTicket as ApiSupportTicket } from '@/services/admin';

const Support = () => {
  const [supportTickets, setSupportTickets] = useState<ApiSupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ApiSupportTicket | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ResponseMethod | null>(null);
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  useEffect(() => {
    void (async () => {
      setSupportTickets(await getSupportTickets());
    })();
  }, []);

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

    await respondToSupportTicket(selectedTicket.id, {
      method,
      message: responseMessage,
      attachmentName: file?.name,
    });

    closeModal();
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_14px_30px_-22px_rgba(22,163,74,0.45)]">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Support Issues</h3>
          <p className="mt-1 text-sm text-slate-500">
            View support tickets, respond to issues, update ticket status, and track resolution.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Clinic Name</th>
                <th className="px-4 py-3">Issue Title</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {supportTickets.length > 0 ? (
                supportTickets.map((ticket) => (
                  <tr
                    className="border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                    key={`${ticket.clinicName}-${ticket.issueTitle}`}
                  >
                    <td className="px-4 py-3 font-medium">{ticket.clinicName || '-'}</td>
                    <td className="px-4 py-3">{ticket.issueTitle || '-'}</td>
                    <td className="px-4 py-3">{ticket.description || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ticket.status === 'Open' ? 'bg-emerald-50 text-emerald-700' :
                        ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ticket.status || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{ticket.priority || '-'}</td>
                    <td className="numeric-inline px-4 py-3">{ticket.createdDate || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        onClick={() => setSelectedTicket(ticket)}
                        type="button"
                      >
                        Respond
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
