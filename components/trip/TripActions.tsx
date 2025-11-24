'use client';

import UMPillButton from '@/components/ui/UMPillButton';

interface TripActionsProps {
  onEdit?: () => void;
  onOverview?: () => void;
}

export default function TripActions({
  onEdit,
  onOverview,
}: TripActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 py-4">
      {onEdit && (
        <UMPillButton onClick={onEdit}>Edit</UMPillButton>
      )}
      {onOverview && (
        <UMPillButton variant="primary" onClick={onOverview}>
          Overview
        </UMPillButton>
      )}
    </div>
  );
}

