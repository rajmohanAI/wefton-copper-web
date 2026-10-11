import type { ElementType, ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

type ContainerProps<T extends ElementType> = {
  as?: T;
  /** `default` caps content at 1280px; `full` keeps the gutters but no max-width. */
  size?: 'default' | 'full';
} & ComponentPropsWithoutRef<T>;

/**
 * Container — the only place that sets content width and horizontal
 * gutters (V2 spec, Req 7.4). Vertical spacing belongs to <Section>.
 */
export default function Container<T extends ElementType = 'div'>({
  as,
  size = 'default',
  className,
  ...props
}: ContainerProps<T>) {
  const Tag: ElementType = as ?? 'div';
  return (
    <Tag
      className={cn('w-full px-4 md:px-8', size === 'default' && 'mx-auto max-w-[1280px]', className)}
      {...props}
    />
  );
}
