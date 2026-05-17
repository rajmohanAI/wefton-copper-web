'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'copper' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium tracking-widest uppercase text-xs transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--copper-light)] disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)] active:scale-[0.98]',
      secondary:
        'bg-white/5 text-[var(--text-light)] border border-white/10 hover:bg-white/10 hover:border-white/20',
      ghost:
        'text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:bg-white/5',
      outline:
        'border border-[var(--copper-main)] text-[var(--copper-light)] hover:bg-[var(--copper-main)] hover:text-white',
      copper:
        'bg-gradient-to-r from-[var(--copper-main)] to-[var(--copper-light)] text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-[var(--copper-glow)]',
      danger:
        'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30',
    };

    const sizes = {
      sm: 'h-8 px-4 text-[10px] rounded',
      md: 'h-10 px-6 rounded',
      lg: 'h-12 px-8 text-sm rounded',
      xl: 'h-14 px-10 text-sm rounded',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>Loading…</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
