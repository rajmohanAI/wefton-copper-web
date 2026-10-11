import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

type SectionProps = ComponentPropsWithoutRef<'section'> & {
  /** `none` drops the vertical rhythm, e.g. for a full-bleed banner. */
  spacing?: 'default' | 'none';
};

/**
 * Section — the only place that sets vertical section rhythm:
 * 64px on phones, 96px from 768px up (V2 spec, Req 7.3/7.4).
 * Width and gutters belong to <Container>.
 */
export default function Section({ spacing = 'default', className, ...props }: SectionProps) {
  return <section className={cn(spacing === 'default' && 'py-16 md:py-24', className)} {...props} />;
}
