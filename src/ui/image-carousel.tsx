'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  aspectRatio?: 'square' | '4/3' | '3/4' | '16/9';
  showNavigation?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ImageCarousel({
  images,
  alt,
  aspectRatio = '4/3',
  showNavigation = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  className = '',
  onImageClick,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const aspectRatioClass = {
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '3/4': 'aspect-[3/4]',
    '16/9': 'aspect-video',
  }[aspectRatio];

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToIndex = useCallback((index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Handle swipe gestures
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (offset < -threshold || velocity < -500) {
        goToNext();
      } else if (offset > threshold || velocity > 500) {
        goToPrev();
      }
    },
    [goToNext, goToPrev]
  );

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, goToNext, images.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [goToNext, goToPrev]);

  // Check if className includes rounded override
  const hasRoundedOverride = className.includes('rounded');
  const roundedClass = hasRoundedOverride ? '' : 'rounded-3xl';

  if (images.length === 0) {
    return (
      <div className={`${aspectRatioClass} bg-gray-100 dark:bg-gray-800 ${roundedClass} ${className}`} />
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${roundedClass} ${className}`}
      tabIndex={0}
      role="region"
      aria-label="Image carousel"
    >
      <div className={`relative ${aspectRatioClass}`}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={images.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={() => !isDragging && onImageClick?.(currentIndex)}
          >
            <Image
              src={images[currentIndex]}
              alt={`${alt} - Image ${currentIndex + 1} of ${images.length}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover pointer-events-none select-none"
              quality={85}
              priority={currentIndex === 0}
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[13px] font-medium">
            {currentIndex + 1}/{images.length}
          </div>
        )}

        {/* Navigation arrows - only show on hover for desktop */}
        {showNavigation && images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center text-gray-900 dark:text-white opacity-0 hover:opacity-100 transition-opacity shadow-lg group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center text-gray-900 dark:text-white opacity-0 hover:opacity-100 transition-opacity shadow-lg group-hover:opacity-100 focus:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Pagination dots */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
