import { ResponseMessageForm } from '@/components/ResponseMessageForm';
import { type ResponseMethod, ResponseMethodSelector } from '@/components/ResponseMethodSelector';

type SupportTicket = {
  clinicName: string;
  issueTitle: string;
  description: string;
  status: string;
  priority: string;
  createdDate: string;
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
        <div className="border-b border-slate-100 px-6 pb-5 pt-6">
          <h3 className="text-lg font-semibold text-slate-900">Respond to Doctor</h3>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="space-y-0.5">
              <dt className="font-semibold text-slate-900">Clinic Name</dt>
              <dd className="leading-5">{ticket.clinicName}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="font-semibold text-slate-900">Issue Title</dt>
              <dd className="leading-5">{ticket.issueTitle}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="font-semibold text-slate-900">Priority</dt>
              <dd className="leading-5">{ticket.priority}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="font-semibold text-slate-900">Status</dt>
              <dd className="leading-5">{ticket.status}</dd>
            </div>
            <div className="space-y-0.5 sm:col-span-2">
              <dt className="font-semibold text-slate-900">Description</dt>
              <dd className="leading-5">{ticket.description}</dd>
            </div>
          </dl>
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
