import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageContainer } from './PageContainer';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  actions?: ReactNode;
}

export function PageIntro({ eyebrow, title, description, align = 'left', actions }: PageIntroProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const actionsAlignment = align === 'center' ? 'justify-center' : 'justify-start';
  const widthPreset = align === 'center' ? 'standard' : 'wide';

  return (
    <section className="w-full pt-12 pb-8">
      <PageContainer width={widthPreset}>
        <div className={cn('flex flex-col gap-3', alignment)}>
          {eyebrow && (
            <p className="text-xs uppercase tracking-[2px] text-gray-500">{eyebrow}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{description}</p>
          )}
          {actions && (
            <div className={cn('mt-2 flex flex-wrap gap-3', actionsAlignment)}>
              {actions}
            </div>
          )}
        </div>
      </PageContainer>
    </section>
  );
}
