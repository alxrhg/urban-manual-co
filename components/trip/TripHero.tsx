'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';

interface TripHeroProps {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  onTitleChange?: (title: string) => void;
  onTitleClick?: () => void;
}

/**
 * TripHero - Editorial hero with distinctive typography and atmospheric design
 * Featuring Instrument Serif display font, staggered entrance animations,
 * and gradient mesh overlay for visual depth
 */
export default function TripHero({
  title,
  destination,
  startDate,
  endDate,
  coverImage,
  onTitleChange,
  onTitleClick,
}: TripHeroProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animations
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format dates with editorial style
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  // Build subtitle with refined separators
  const subtitleParts: string[] = [];
  if (destination) subtitleParts.push(destination);
  if (startDate && endDate) {
    subtitleParts.push(`${formatDate(startDate)} — ${formatDate(endDate)}`);
  } else if (startDate) {
    subtitleParts.push(formatDate(startDate));
  }
  const subtitle = subtitleParts.join(' · ');

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== title) {
      onTitleChange?.(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden">
      {/* Background Image with enhanced treatment */}
      {coverImage ? (
        <>
          <Image
            src={coverImage}
            alt={title}
            fill
            className="absolute inset-0 z-0 object-cover grayscale-[30%] scale-105 transition-transform duration-[3s] hover:scale-100"
            priority
          />
          {/* Subtle noise texture overlay */}
          <div
            className="absolute inset-0 z-[1] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </>
      ) : (
        /* Gradient mesh for trips without cover image */
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-amber-50/30 dark:from-gray-950 dark:via-neutral-900 dark:to-gray-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/20" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-200/50 to-transparent dark:from-gray-800/30" />
        </div>
      )}

      {/* Enhanced gradient overlay for text legibility */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-white via-white/80 via-30% to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a]/80" />

      {/* Subtle vignette effect */}
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.05)_100%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]" />

      {/* Content with staggered entrance animations */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 z-10">
        <div className="max-w-3xl">
          {/* Kicker/Label */}
          {subtitle && (
            <p
              className={`
                text-[11px] uppercase tracking-[0.25em] font-medium
                text-gray-500 dark:text-gray-400 mb-4
                opacity-0 ${mounted ? 'animate-fade-in' : ''}
              `}
              style={{ animationDelay: '0.1s' }}
            >
              {subtitle}
            </p>
          )}

          {/* Main Title - Instrument Serif for distinctive editorial feel */}
          {isEditing && onTitleChange ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="text-4xl md:text-6xl lg:text-7xl font-display text-gray-900 dark:text-white leading-[1.1] tracking-[-0.02em] bg-transparent border-none outline-none w-full focus:ring-0"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => onTitleChange ? setIsEditing(true) : onTitleClick?.()}
              className={`
                text-4xl md:text-6xl lg:text-7xl font-display
                text-gray-900 dark:text-white
                leading-[1.1] tracking-[-0.02em]
                opacity-0 ${mounted ? 'animate-slide-up' : ''}
                ${onTitleChange || onTitleClick ? 'cursor-pointer hover:opacity-80 transition-opacity duration-300' : ''}
              `}
              style={{ animationDelay: '0.2s' }}
            >
              {title}
            </h1>
          )}

          {/* Decorative accent line */}
          <div
            className={`
              mt-6 h-px w-16 bg-gradient-to-r from-gray-300 to-transparent
              dark:from-gray-700 dark:to-transparent
              opacity-0 ${mounted ? 'animate-fade-in' : ''}
            `}
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
