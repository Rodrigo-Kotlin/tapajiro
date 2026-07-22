import { type ButtonHTMLAttributes, type ReactNode } from 'react';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  'aria-label': string;
  children: ReactNode;
}

const variantStyles: Record<IconButtonVariant, string> = {
  primary: 'bg-action-primary text-white hover:bg-brand-electric active:bg-brand-navy',
  secondary:
    'border-2 border-action-primary text-action-primary bg-transparent hover:bg-action-primary/10 active:bg-action-primary/20',
  ghost:
    'bg-transparent text-action-primary hover:bg-action-primary/10 active:bg-action-primary/20',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'min-h-[44px] min-w-[44px] rounded-[12px]',
  md: 'min-h-[44px] min-w-[44px] rounded-[12px]',
  lg: 'min-h-[48px] min-w-[48px] rounded-[12px]',
};

export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      ) : (
        children
      )}
    </button>
  );
}
