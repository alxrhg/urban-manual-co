'use client';

import {
  CardShell,
  DestinationCardV2,
  DestinationCardV2Props,
  LazyDestinationCard as LazyDestinationCardBase,
} from './design-system/DestinationCardV2';

type BaseProps = Pick<DestinationCardV2Props, 'destination' | 'index' | 'isVisited' | 'className'>;

export interface DestinationCardProps extends BaseProps {
  onClick: () => void;
  showBadges?: boolean;
}

export function DestinationCard({ onClick, showBadges = true, ...rest }: DestinationCardProps) {
  return (
    <DestinationCardV2
      {...rest}
      onSelect={() => onClick()}
      showIntelligenceBadges={showBadges}
    />
  );
}

export function LazyDestinationCard({ onClick, showBadges = true, ...rest }: DestinationCardProps) {
  return (
    <LazyDestinationCardBase
      {...rest}
      onSelect={() => onClick()}
      showIntelligenceBadges={showBadges}
    />
  );
}

export { CardShell };
