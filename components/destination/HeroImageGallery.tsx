'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Grid3X3 } from 'lucide-react';

interface Photo {
  photo_reference?: string;
  url?: string;
  width?: number;
  height?: number;
}

interface HeroImageGalleryProps {
  mainImage?: string | null;
  photos?: Photo[];
  destinationName: string;
  category: string;
  city: string;
}

export function HeroImageGallery({
  mainImage,
  photos = [],
  destinationName,
  category,
  city,
}: HeroImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Build array of all available images
  const allImages: string[] = [];
  if (mainImage) allImages.push(mainImage);

  photos.forEach((photo) => {
    const url = photo.url || (photo.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
      : null);
    if (url && !allImages.includes(url)) {
      allImages.push(url);
    }
  });

  const hasMultipleImages = allImages.length > 1;
  const displayedImages = allImages.slice(0, 5);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  }, [allImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  }, [allImages.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setIsGalleryOpen(false);
  }, [handlePrev, handleNext]);

  if (allImages.length === 0) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-600 text-sm">No images available</div>
      </div>
    );
  }

  // Single image display
  if (!hasMultipleImages) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 shadow-sm">
        <Image
          src={allImages[0]}
          alt={`${destinationName} - ${category} in ${city}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className="object-cover"
          quality={90}
          priority
        />
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="relative w-full">
        {/* Main grid layout */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[400px] lg:h-[480px] rounded-2xl overflow-hidden">
          {/* Main large image */}
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsGalleryOpen(true);
            }}
            className="col-span-2 row-span-2 relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white"
          >
            <Image
              src={displayedImages[0]}
              alt={`${destinationName} - ${category} in ${city}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              quality={90}
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>

          {/* Secondary images */}
          {displayedImages.slice(1, 5).map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx + 1);
                setIsGalleryOpen(true);
              }}
              className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white"
            >
              <Image
                src={img}
                alt={`${destinationName} - photo ${idx + 2}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                quality={75}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}

          {/* Show all photos button */}
          {allImages.length > 5 && (
            <button
              onClick={() => setIsGalleryOpen(true)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              Show all {allImages.length} photos
            </button>
          )}
        </div>
      </div>

      {/* Full-screen Gallery Modal */}
      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          {/* Close button */}
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
            {currentIndex + 1} / {allImages.length}
          </div>

          {/* Previous button */}
          <button
            onClick={handlePrev}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Current image */}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-auto px-16">
            <Image
              src={allImages[currentIndex]}
              alt={`${destinationName} - photo ${currentIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              quality={90}
              priority
            />
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 rounded-lg bg-black/50 overflow-x-auto max-w-[90vw]">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-12 rounded overflow-hidden flex-shrink-0 transition-all ${
                  currentIndex === idx
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
