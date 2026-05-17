import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'copper' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export default function Badge({ children, variant = 'copper', className }: BadgeProps) {
  const variants = {
    copper: 'bg-[var(--copper-main)]/20 text-[var(--copper-light)] border border-[var(--copper-main)]/30',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    neutral: 'bg-white/5 text-[var(--text-muted)] border border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
