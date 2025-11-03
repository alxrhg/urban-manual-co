import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type WidthPreset = 'narrow' | 'standard' | 'wide';

const WIDTH_MAP: Record<WidthPreset, string> = {
  narrow: 'max-w-4xl',
  standard: 'max-w-5xl',
  wide: 'max-w-6xl',
};

interface PageContainerProps {
  children: ReactNode;
  width?: WidthPreset;
  className?: string;
}

export function PageContainer({ children, width = 'wide', className }: PageContainerProps) {
  return (
    <div className={cn('mx-auto px-4 md:px-6 lg:px-10', WIDTH_MAP[width], className)}>
      {children}
    </div>
  );
}
