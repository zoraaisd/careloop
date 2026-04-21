export type ResponseMethod = 'email' | 'whatsapp';

type ResponseMethodSelectorProps = {
  selectedMethod: ResponseMethod | null;
  onMethodChange: (method: ResponseMethod) => void;
};

const options: { label: string; value: ResponseMethod }[] = [
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
];

const methodHint: Record<ResponseMethod, string> = {
  email: 'Response will be sent to clinic email.',
  whatsapp: 'Response will be sent to clinic phone number.',
};

const ResponseMethodSelector = ({ selectedMethod, onMethodChange }: ResponseMethodSelectorProps) => {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">Select Response Method</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = selectedMethod === option.value;

          return (
            <label
              className={[
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition',
                isSelected
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              ].join(' ')}
              key={option.value}
            >
              <input
                checked={isSelected}
                className="h-4 w-4 accent-emerald-600"
                name="responseMethod"
                onChange={() => onMethodChange(option.value)}
                type="radio"
              />
              <span className="font-medium">{option.label}</span>
            </label>
          );
        })}
      </div>

      {selectedMethod ? <p className="mt-2 text-xs text-slate-500">{methodHint[selectedMethod]}</p> : null}
    </div>
  );
};

export { ResponseMethodSelector };
