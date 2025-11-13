'use client';

import * as React from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { MapPin, Check } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationBadges } from '@/components/DestinationBadges';

export type MediaBadgePlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface MediaBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function MediaBadge({ children, className }: MediaBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface CardShellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const CardShell = React.forwardRef<HTMLButtonElement, CardShellProps>(
  ({ children, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'group relative flex w-full flex-col text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white hover:scale-[1.01] active:scale-[0.99]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
CardShell.displayName = 'CardShell';

export interface DestinationCardV2Props {
  destination: Destination;
  index?: number;
  onSelect?: (destination: Destination) => void;
  isVisited?: boolean;
  showIntelligenceBadges?: boolean;
  className?: string;
  metaPrimary?: React.ReactNode;
  metaSecondary?: React.ReactNode;
  mediaBadges?: Partial<Record<MediaBadgePlacement, React.ReactNode>>;
  overlayContent?: React.ReactNode;
  footerSlot?: React.ReactNode;
  badgeSlot?: React.ReactNode;
}

export function DestinationCardV2({
  destination,
  index = 0,
  onSelect,
  isVisited = false,
  showIntelligenceBadges = false,
  className,
  metaPrimary,
  metaSecondary,
  mediaBadges,
  overlayContent,
  footerSlot,
  badgeSlot,
}: DestinationCardV2Props) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const cardRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '80px', threshold: 0.1 }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const cityLabel = destination.city ? capitalizeCity(destination.city) : 'this destination';

  const fallbackMeta = React.useMemo(() => {
    if (destination.micro_description) {
      return destination.micro_description;
    }

    if (destination.category && destination.city) {
      return `${destination.category} in ${capitalizeCity(destination.city)}`;
    }

    if (destination.city) {
      return `Located in ${capitalizeCity(destination.city)}`;
    }

    return destination.category || 'Featured destination';
  }, [destination.micro_description, destination.category, destination.city]);

  return (
    <CardShell
      ref={cardRef}
      onClick={() => onSelect?.(destination)}
      aria-label={`View ${destination.name} in ${cityLabel}`}
      className={clsx('text-left', className)}
    >
      <div
        className={clsx(
          'relative mb-3 aspect-video overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-900',
          isLoaded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {!isLoaded && isInView ? (
          <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-800" />
        ) : null}

        {isInView && destination.image && !imageError ? (
          <Image
            src={destination.image}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}`}
            fill
            className={clsx('object-cover transition duration-500 ease-out group-hover:scale-105', isLoaded ? 'opacity-100' : 'opacity-0')}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(true);
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="h-10 w-10 opacity-20" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {overlayContent}

        {isVisited && (
          <div className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 backdrop-blur dark:bg-gray-900/80 dark:text-white">
            <Check className="h-5 w-5" />
          </div>
        )}

        {mediaBadges?.topLeft ? (
          <div className="absolute left-2 top-2 z-10">{mediaBadges.topLeft}</div>
        ) : null}
        {mediaBadges?.topRight ? (
          <div className="absolute right-2 top-2 z-10">{mediaBadges.topRight}</div>
        ) : null}
        {mediaBadges?.bottomLeft ? (
          <div className="absolute bottom-2 left-2 z-10">{mediaBadges.bottomLeft}</div>
        ) : null}
        {mediaBadges?.bottomRight ? (
          <div className="absolute bottom-2 right-2 z-10">{mediaBadges.bottomRight}</div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 transition-colors duration-200 line-clamp-2 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200">
              {destination.name}
            </h3>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">
              {metaPrimary ?? fallbackMeta}
            </div>
            {metaSecondary ? (
              <div className="text-[11px] text-gray-500 dark:text-gray-500 line-clamp-1">{metaSecondary}</div>
            ) : null}
          </div>
          {badgeSlot}
        </div>

        {footerSlot}
        {showIntelligenceBadges && destination.id ? (
          <DestinationBadges destinationId={destination.id} compact showTiming={false} />
        ) : null}
      </div>
    </CardShell>
  );
}

export function LazyDestinationCard(props: DestinationCardV2Props) {
  const [shouldRender, setShouldRender] = React.useState(false);
  const placeholderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!placeholderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(placeholderRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div ref={placeholderRef}>{shouldRender ? <DestinationCardV2 {...props} /> : null}</div>;
}
