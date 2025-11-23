'use client';

import UMPillButton from '@/components/ui/UMPillButton';

interface TripActionsProps {
  onSave?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onOverview?: () => void;
}

export default function TripActions({
  onSave,
  onShare,
  onPrint,
  onOverview,
}: TripActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 py-4">
      {onSave && (
        <UMPillButton onClick={onSave}>Save</UMPillButton>
      )}
      {onShare && (
        <UMPillButton onClick={onShare}>Share</UMPillButton>
      )}
      {onPrint && (
        <UMPillButton onClick={onPrint}>Print</UMPillButton>
      )}
      {onOverview && (
        <UMPillButton variant="primary" onClick={onOverview}>
          Overview
        </UMPillButton>
      )}
    </div>
  );
}

