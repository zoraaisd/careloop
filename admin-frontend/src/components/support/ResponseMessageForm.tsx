type ResponseMessageFormProps = {
  message: string;
  onMessageChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  attachedFile: File | null;
};

const ResponseMessageForm = ({ message, onMessageChange, onFileChange, attachedFile }: ResponseMessageFormProps) => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900" htmlFor="response-message">
          Response Message
        </label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          id="response-message"
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Hello,

We have identified the issue and our team is currently working on it.

Thank you for your patience."
          value={message}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900" htmlFor="attach-file">
          Attach File <span className="font-normal text-slate-500">(Optional)</span>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <input
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
            id="attach-file"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>
        {attachedFile ? <p className="mt-2 text-xs text-slate-500">Selected: {attachedFile.name}</p> : null}
      </div>
    </div>
  );
};

export { ResponseMessageForm };
