import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LAYOUT_MAX_WIDTHS, type LayoutWidthPreset } from '@/lib/layout';

type WidthPreset = LayoutWidthPreset;

interface PageContainerProps {
  children: ReactNode;
  width?: WidthPreset;
  className?: string;
}

export function PageContainer({ children, width = 'wide', className }: PageContainerProps) {
  return (
    <div className={cn('w-full px-6 md:px-10 lg:px-12', className)}>
      <div className={cn('mx-auto', LAYOUT_MAX_WIDTHS[width])}>
        {children}
      </div>
    </div>
  );
}
