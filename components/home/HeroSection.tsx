'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface HeroSectionProps {
  /** Hero background image URL */
  heroImage?: string;
  /** Alternative text for the hero image */
  heroImageAlt?: string;
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
}

/**
 * HeroSection - Full-screen immersive hero with editorial typography
 * Designed for the Lovably aesthetic
 */
export function HeroSection({
  heroImage = '/hero-default.jpg',
  heroImageAlt = 'Urban Manual - Curated travel destinations',
  onSearch,
}: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt={heroImageAlt}
          fill
          className={`object-cover transition-opacity duration-700 ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          priority
          quality={90}
          onLoad={() => setIsImageLoaded(true)}
        />
        {/* Fallback gradient while image loads */}
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-950" />
        )}
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Editorial Headline */}
        <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.85] tracking-tight mb-8">
          The World<br />Curated
        </h1>

        {/* Subtitle */}
        <p className="font-body text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-12">
          Discover handpicked hotels, restaurants, and hidden gems across 50+ cities worldwide.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="w-full max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-4 px-6 pr-14 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all font-body"
              aria-label="Search destinations"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-px h-12 bg-gradient-to-b from-white/0 via-white/50 to-white/0" />
      </div>
    </section>
  );
}
