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
    <div className={cn('w-full px-6 md:px-10 lg:px-12', className)}>
      <div className={cn('mx-auto', WIDTH_MAP[width])}>
        {children}
      </div>
    </div>
  );
}
