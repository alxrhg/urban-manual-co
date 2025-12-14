/**
 * Lazy Image Component
 *
 * Optimized image component with:
 * - Lazy loading
 * - Blur placeholder
 * - Fade-in animation
 * - Error handling
 */

'use client';

import * as React from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** Fallback image on error */
  fallback?: string;
  /** Whether to show blur placeholder */
  showPlaceholder?: boolean;
  /** Custom placeholder color */
  placeholderColor?: string;
  /** Fade-in duration in ms */
  fadeInDuration?: number;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Aspect ratio for container */
  aspectRatio?: string;
  /** Custom wrapper class */
  wrapperClassName?: string;
}

// Default blur data URL - a small gray placeholder
const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+';

// Default fallback image
const DEFAULT_FALLBACK = '/images/placeholder.jpg';

export function LazyImage({
  src,
  alt,
  fallback = DEFAULT_FALLBACK,
  showPlaceholder = true,
  placeholderColor = '#e5e7eb',
  fadeInDuration = 300,
  onLoad,
  onError,
  aspectRatio,
  wrapperClassName,
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(src);

  // Reset state when src changes
  React.useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallback);
      onError?.(new Error(`Failed to load image: ${src}`));
    }
  }, [hasError, fallback, src, onError]);

  // Generate blur data URL with custom color
  const blurDataURL = React.useMemo(() => {
    if (!showPlaceholder) return undefined;
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${placeholderColor}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [showPlaceholder, placeholderColor]);

  const wrapperStyle = aspectRatio
    ? { aspectRatio, position: 'relative' as const }
    : {};

  return (
    <div
      className={cn('overflow-hidden', wrapperClassName)}
      style={wrapperStyle}
    >
      <Image
        {...props}
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          transitionDuration: `${fadeInDuration}ms`,
          ...props.style,
        }}
        placeholder={showPlaceholder ? 'blur' : 'empty'}
        blurDataURL={blurDataURL || DEFAULT_BLUR_DATA_URL}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Skeleton placeholder for images
 */
interface ImageSkeletonProps {
  /** Width of skeleton */
  width?: number | string;
  /** Height of skeleton */
  height?: number | string;
  /** Aspect ratio */
  aspectRatio?: string;
  /** Custom class name */
  className?: string;
}

export function ImageSkeleton({
  width,
  height,
  aspectRatio,
  className,
}: ImageSkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (aspectRatio ? 'auto' : '100%'),
    aspectRatio,
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-800 animate-pulse rounded',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Lazy avatar image with fallback to initials
 */
interface LazyAvatarImageProps extends Omit<LazyImageProps, 'width' | 'height' | 'fill'> {
  /** Size in pixels */
  size?: number;
  /** Fallback initials */
  initials?: string;
  /** Background color for initials fallback */
  initialsBackground?: string;
}

export function LazyAvatarImage({
  src,
  alt,
  size = 40,
  initials,
  initialsBackground = '#6b7280',
  className,
  ...props
}: LazyAvatarImageProps) {
  const [showFallback, setShowFallback] = React.useState(!src);

  React.useEffect(() => {
    setShowFallback(!src);
  }, [src]);

  if (showFallback && initials) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full text-white font-medium',
          className
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: initialsBackground,
          fontSize: size * 0.4,
        }}
        aria-label={alt}
      >
        {initials.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <LazyImage
      src={src || ''}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
      onError={() => setShowFallback(true)}
      showPlaceholder={false}
      {...props}
    />
  );
}

/**
 * Background image with gradient overlay
 */
interface BackgroundImageProps extends Omit<LazyImageProps, 'fill' | 'height' | 'width'> {
  /** Gradient overlay */
  gradient?: string;
  /** Children to render over the image */
  children?: React.ReactNode;
  /** Container height */
  height?: number | string;
}

export function BackgroundImage({
  src,
  alt,
  gradient = 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  children,
  height = 300,
  className,
  wrapperClassName,
  ...props
}: BackgroundImageProps) {
  return (
    <div
      className={cn('relative overflow-hidden', wrapperClassName)}
      style={{ height }}
    >
      <LazyImage
        src={src}
        alt={alt}
        fill
        className={cn('object-cover', className)}
        {...props}
      />
      {gradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: gradient }}
          aria-hidden="true"
        />
      )}
      {children && (
        <div className="absolute inset-0 flex items-end">{children}</div>
      )}
    </div>
  );
}
