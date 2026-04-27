import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type SharedProps = {
  className?: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

type ButtonProps = SharedProps &
  PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & {
      to?: never;
    }
  >;

type LinkButtonProps = SharedProps &
  PropsWithChildren<{
    to: string;
  }>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#16A34A] text-white shadow-lg shadow-green-500/20 hover:bg-[#15803D] focus-visible:ring-[#16A34A]',
  secondary:
    'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:ring-slate-300',
  ghost:
    'bg-transparent text-slate-700 hover:bg-white/70 focus-visible:ring-slate-300',
};

const baseClassName =
  'inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const composeClassName = ({
  className,
  variant = 'primary',
  fullWidth,
}: SharedProps) =>
  [baseClassName, variantClasses[variant], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

const Button = ({
  children,
  className,
  variant = 'primary',
  fullWidth,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={composeClassName({ className, variant, fullWidth })}
      {...props}
    >
      {children}
    </button>
  );
};

const LinkButton = ({
  children,
  className,
  to,
  variant = 'primary',
  fullWidth,
}: LinkButtonProps) => {
  return (
    <Link
      className={composeClassName({ className, variant, fullWidth })}
      to={to}
    >
      {children}
    </Link>
  );
};

export { Button, LinkButton };
