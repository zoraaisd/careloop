import { ResponseMessageForm } from '@/components/support/ResponseMessageForm';
import { type ResponseMethod, ResponseMethodSelector } from '@/components/support/ResponseMethodSelector';

type SupportTicket = {
  clinicName: string;
  issueTitle: string;
  description: string;
  status: string;
  priority: string;
  createdDate: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

type RespondPayload = {
  method: ResponseMethod;
  message: string;
  attachedFile: File | null;
};

type RespondModalProps = {
  isOpen: boolean;
  ticket: SupportTicket | null;
  selectedMethod: ResponseMethod | null;
  message: string;
  attachedFile: File | null;
  onClose: () => void;
  onMethodChange: (method: ResponseMethod) => void;
  onMessageChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onSend: (payload: RespondPayload) => void;
};

const RespondModal = ({
  isOpen,
  ticket,
  selectedMethod,
  message,
  attachedFile,
  onClose,
  onMethodChange,
  onMessageChange,
  onFileChange,
  onSend,
}: RespondModalProps) => {
  if (!isOpen || !ticket) {
    return null;
  }

  const canSend = Boolean(selectedMethod && message.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        aria-label="Close response modal"
        className="absolute inset-0 bg-slate-900/55"
        onClick={onClose}
        type="button"
      />

      <section
        className="relative z-10 flex w-full max-w-3xl max-h-[88vh] flex-col overflow-y-auto rounded-2xl border border-emerald-100 bg-white shadow-2xl [&::-webkit-scrollbar]:hidden"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        <button
          aria-label="Close modal"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-slate-500 transition hover:bg-red-500 hover:text-white"
          onClick={onClose}
          type="button"
        >
          &times;
        </button>
        <div className="border-b border-slate-100 bg-[#f8fbf9] px-8 pb-8 pt-8">
          <div className="mb-6">
            <h3 className="text-xl font-black text-slate-900">Respond to Doctor</h3>
            <p className="text-xs font-medium text-slate-500">Review ticket details and send your response.</p>
          </div>
          
          <div className="rounded-[24px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1faa62]">{ticket.priority} Priority</h4>
                <h2 className="mt-1 text-lg font-black text-slate-900">{ticket.issueTitle}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                {ticket.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</p>
                <p className="text-sm leading-relaxed text-slate-700">{ticket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic Name</p>
                  <p className="text-sm font-bold text-slate-900">{ticket.clinicName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Received On</p>
                  <p className="text-sm font-bold text-slate-900">{ticket.createdDate}</p>
                </div>
              </div>

              {ticket.attachmentUrl && (
                <div className="mt-4 rounded-xl border border-emerald-50 bg-emerald-50/30 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">Document Sent by Doctor</p>
                  <a 
                    href={import.meta.env.VITE_API_URL?.replace('/api', '') + ticket.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    download={ticket.attachmentName || 'support-document'}
                    className="group flex items-center justify-between rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">{ticket.attachmentName || 'View Document'}</span>
                    </div>
                    <svg className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-5">
            <ResponseMethodSelector onMethodChange={onMethodChange} selectedMethod={selectedMethod} />
            <ResponseMessageForm
              attachedFile={attachedFile}
              message={message}
              onFileChange={onFileChange}
              onMessageChange={onMessageChange}
            />
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-5">
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={!canSend}
            onClick={() => {
              if (!selectedMethod) {
                return;
              }

              onSend({ method: selectedMethod, message: message.trim(), attachedFile });
            }}
            type="button"
          >
            Send Response
          </button>
        </div>
      </section>
    </div>
  );
};

export { RespondModal };
export type { RespondPayload, SupportTicket };
