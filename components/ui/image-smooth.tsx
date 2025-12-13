'use client';

import React, { useState, useCallback } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface ImageSmoothProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** Show shimmer placeholder while loading */
  shimmer?: boolean;
  /** Custom fallback component or element */
  fallback?: React.ReactNode;
  /** Wrapper className */
  wrapperClassName?: string;
  /** Callback when image loads successfully */
  onLoadComplete?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * ImageSmooth - Next.js Image with smooth loading transition
 * Implements Ubiquiti-style fade-in on load
 *
 * @example
 * <ImageSmooth
 *   src="/image.jpg"
 *   alt="Description"
 *   width={400}
 *   height={300}
 *   shimmer
 * />
 */
export function ImageSmooth({
  shimmer = true,
  fallback,
  wrapperClassName,
  onLoadComplete,
  onError: onErrorCallback,
  className,
  alt,
  ...props
}: ImageSmoothProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    onErrorCallback?.();
  }, [onErrorCallback]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* Shimmer placeholder */}
      {shimmer && !isLoaded && (
        <div
          className={cn(
            'absolute inset-0 skeleton-pulse',
            isLoaded && 'opacity-0'
          )}
          style={{
            transition: 'opacity var(--duration-normal) var(--ease-smooth)',
          }}
        />
      )}

      <Image
        {...props}
        alt={alt}
        className={cn(
          'transition-opacity duration-[var(--duration-slow)] ease-[cubic-bezier(0.16,1,0.3,1)]',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Blur placeholder image with smooth reveal
 * Use this for hero images and important above-fold content
 */
interface BlurImageProps extends ImageSmoothProps {
  /** Low-quality image placeholder (base64 or URL) */
  blurDataURL?: string;
}

export function BlurImage({
  blurDataURL,
  shimmer = false,
  ...props
}: BlurImageProps) {
  return (
    <ImageSmooth
      {...props}
      shimmer={shimmer}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
    />
  );
}

/**
 * Aspect ratio image container with smooth loading
 * Prevents layout shift during image load
 */
interface AspectImageProps extends ImageSmoothProps {
  /** Aspect ratio (e.g., '16/9', '4/3', '1/1') */
  aspectRatio?: string;
}

export function AspectImage({
  aspectRatio = '4/3',
  wrapperClassName,
  ...props
}: AspectImageProps) {
  return (
    <ImageSmooth
      {...props}
      wrapperClassName={cn(wrapperClassName)}
      fill
      style={{
        ...props.style,
        aspectRatio,
      }}
      sizes={props.sizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
    />
  );
}

export default ImageSmooth;
