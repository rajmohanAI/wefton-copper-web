import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant: 'product-card' | 'banner' | 'text-block' | 'nav-item';
  className?: string;
}

const VARIANT_STYLES: Record<SkeletonLoaderProps['variant'], string> = {
  'product-card': 'space-y-3',
  'banner': 'w-full aspect-[16/7] md:aspect-[16/5] rounded-none',
  'text-block': 'space-y-2',
  'nav-item': 'h-5 w-20 rounded',
};

export function SkeletonLoader({ variant, className }: SkeletonLoaderProps) {
  if (variant === 'product-card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (variant === 'text-block') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn(VARIANT_STYLES[variant], 'bg-muted animate-pulse', className)} />
  );
}
