'use client';

import { type ReactNode } from 'react';
import clsx from 'clsx';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { type ExtractedIntent } from '@/app/api/intent/schema';

interface IntentChipGroupProps {
  intent: ExtractedIntent | null;
  heading?: string;
  onChipRemove?: (chipType: string, value: string) => void;
  editable?: boolean;
  className?: string;
  renderChips?: () => ReactNode;
  emptyState?: ReactNode;
}

export function IntentChipGroup({
  intent,
  heading,
  onChipRemove,
  editable = true,
  className,
  renderChips,
  emptyState = null,
}: IntentChipGroupProps) {
  const resolvedContent = renderChips
    ? renderChips()
    : intent
      ? <IntentConfirmationChips intent={intent} onChipRemove={onChipRemove} editable={editable} />
      : null;

  if (!resolvedContent) {
    return <>{emptyState}</>;
  }

  return (
    <div className={clsx('mt-4', className)} aria-live="polite">
      {heading ? <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{heading}</p> : null}
      {resolvedContent}
    </div>
  );
}
