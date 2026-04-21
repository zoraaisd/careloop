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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close response modal"
        className="absolute inset-0 bg-slate-900/55"
        onClick={onClose}
        type="button"
      />

      <section className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Respond to Clinic</h3>
          <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-900">Clinic Name</dt>
              <dd>{ticket.clinicName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Issue Title</dt>
              <dd>{ticket.issueTitle}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Priority</dt>
              <dd>{ticket.priority}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Status</dt>
              <dd>{ticket.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-900">Description</dt>
              <dd>{ticket.description}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-5 py-5">
          <ResponseMethodSelector onMethodChange={onMethodChange} selectedMethod={selectedMethod} />
          <ResponseMessageForm
            attachedFile={attachedFile}
            message={message}
            onFileChange={onFileChange}
            onMessageChange={onMessageChange}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
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
