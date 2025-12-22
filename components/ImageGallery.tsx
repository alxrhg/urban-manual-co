'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2, ZoomIn } from 'lucide-react';

export interface GalleryImage {
  url: string;
  alt?: string;
  credit?: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  initialIndex?: number;
  className?: string;
  showThumbnails?: boolean;
  showCredits?: boolean;
  aspectRatio?: 'video' | 'square' | 'portrait';
}

/**
 * Enhanced Image Gallery with navigation, thumbnails, credits, and fullscreen mode
 * Designed for architectural photography with proper attribution
 */
export function ImageGallery({
  images,
  initialIndex = 0,
  className = '',
  showThumbnails = true,
  showCredits = true,
  aspectRatio = 'video',
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const current = images[currentIndex];
  const hasNext = currentIndex < images.length - 1;
  const hasPrev = currentIndex > 0;

  const goToNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
      setIsLoaded(false);
    }
  }, [currentIndex, hasNext]);

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
      setIsLoaded(false);
    }
  }, [currentIndex, hasPrev]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      setIsLoaded(false);
    }
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') setIsFullscreen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Lock scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (!images.length) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-400 dark:text-gray-500">No images available</p>
      </div>
    );
  }

  const aspectRatioClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Main Image Container */}
        <div className={`relative ${aspectRatioClass} bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group`}>
          {/* Loading skeleton */}
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
          )}

          {/* Main Image */}
          <Image
            src={current.url}
            alt={current.alt || 'Gallery image'}
            fill
            className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 100vw, 50vw"
            onLoad={() => setIsLoaded(true)}
            priority={currentIndex === 0}
          />

          {/* Navigation Arrows */}
          {hasPrev && (
            <button
              onClick={goToPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="View fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Caption and Credit */}
        {showCredits && (current.caption || current.credit) && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {current.caption && <p className="font-medium">{current.caption}</p>}
            {current.credit && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                Photo: {current.credit}
              </p>
            )}
          </div>
        )}

        {/* Thumbnail Strip */}
        {showThumbnails && images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => goToIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `Thumbnail ${idx + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
            aria-label="Close fullscreen"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation Arrows - Fullscreen */}
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Fullscreen Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.url}
              alt={current.alt || 'Gallery image'}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Counter - Fullscreen */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Caption and Credit - Fullscreen */}
          {showCredits && (current.caption || current.credit) && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center text-white max-w-xl px-4">
              {current.caption && <p className="font-medium">{current.caption}</p>}
              {current.credit && (
                <p className="text-sm text-white/70 mt-1">Photo: {current.credit}</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ImageGallery;
