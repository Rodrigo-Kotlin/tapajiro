import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'attention' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-white font-semibold hover:bg-brand-electric active:bg-brand-navy',
  secondary:
    'border-2 border-action-primary text-action-primary bg-transparent hover:bg-action-primary/10 active:bg-action-primary/20',
  tertiary:
    'bg-transparent text-action-primary hover:bg-action-primary/10 active:bg-action-primary/20',
  attention:
    'bg-attention text-text-primary font-semibold hover:bg-brand-orange-soft active:brightness-90',
  danger: 'bg-danger text-white font-semibold hover:brightness-110 active:brightness-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3 py-2 text-sm rounded-[12px]',
  md: 'min-h-[44px] px-5 py-3 text-base rounded-[12px]',
  lg: 'min-h-[44px] px-6 py-3.5 text-lg rounded-[12px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
