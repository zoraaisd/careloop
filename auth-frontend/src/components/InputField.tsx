import type { InputHTMLAttributes, ReactNode } from 'react';

type InputFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const InputField = ({
  label,
  error,
  hint,
  icon,
  wrapperClassName,
  className,
  id,
  ...props
}: InputFieldProps) => {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className={['block', wrapperClassName].filter(Boolean).join(' ')} htmlFor={inputId}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            {icon}
          </span>
        ) : null}
        <input
          className={[
            'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2D8CFF] focus:ring-4 focus:ring-blue-100',
            icon ? 'pl-11' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          id={inputId}
          {...props}
        />
      </span>
      {error ? (
        <span className="mt-2 block text-xs font-medium text-rose-500">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="mt-2 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
};

export { InputField };
