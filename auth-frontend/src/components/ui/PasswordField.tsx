import { useState, type ChangeEventHandler } from 'react';

import { InputField } from '@/components/ui/InputField';

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
};

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={
        visible
          ? 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z'
          : 'M3 4.5 20 19.5M2 12s3.5-6 10-6c2.03 0 3.75.58 5.17 1.42M22 12s-3.5 6-10 6c-2.03 0-3.75-.58-5.17-1.42'
      }
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <InputField
        label={label}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        value={value}
      />
      <button
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-4 top-[2.55rem] text-slate-400 transition hover:text-slate-600"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
};

export { PasswordField };
