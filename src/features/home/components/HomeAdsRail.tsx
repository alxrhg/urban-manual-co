import { ReactNode } from 'react';

interface HomeAdsRailProps {
  top?: ReactNode;
  bottom?: ReactNode;
}

export function HomeAdsRail({ top, bottom }: HomeAdsRailProps) {
  if (!top && !bottom) return null;

  return (
    <div className="space-y-6">
      {top && <div>{top}</div>}
      {bottom && <div>{bottom}</div>}
    </div>
  );
}
