'use client';

import React, { useMemo } from 'react';

interface PassportStampProps {
  city: string;
  country?: string;
  date?: string;
  onClick?: () => void;
}

// City to abbreviation mapping (common cities)
const cityAbbreviations: Record<string, string> = {
  'new-york': 'NYC',
  'new york': 'NYC',
  'los-angeles': 'LAX',
  'los angeles': 'LAX',
  'london': 'LDN',
  'paris': 'PAR',
  'tokyo': 'TYO',
  'rome': 'ROM',
  'barcelona': 'BCN',
  'berlin': 'BER',
  'amsterdam': 'AMS',
  'sydney': 'SYD',
  'hong-kong': 'HKG',
  'hong kong': 'HKG',
  'singapore': 'SIN',
  'dubai': 'DXB',
  'milan': 'MIL',
  'copenhagen': 'CPH',
  'stockholm': 'STO',
  'vienna': 'VIE',
  'madrid': 'MAD',
  'lisbon': 'LIS',
  'mexico-city': 'MEX',
  'mexico city': 'MEX',
  'buenos-aires': 'BUE',
  'buenos aires': 'BUE',
  'sao-paulo': 'SAO',
  'sao paulo': 'SAO',
  'shanghai': 'SHA',
  'beijing': 'PEK',
  'seoul': 'SEL',
  'bangkok': 'BKK',
  'mumbai': 'BOM',
  'delhi': 'DEL',
  'istanbul': 'IST',
  'cairo': 'CAI',
  'cape-town': 'CPT',
  'cape town': 'CPT',
  'marrakech': 'RAK',
  'kyoto': 'KYO',
  'florence': 'FLR',
  'venice': 'VCE',
  'zurich': 'ZRH',
  'geneva': 'GVA',
  'munich': 'MUC',
  'prague': 'PRG',
  'budapest': 'BUD',
  'athens': 'ATH',
  'san-francisco': 'SFO',
  'san francisco': 'SFO',
  'chicago': 'CHI',
  'miami': 'MIA',
  'seattle': 'SEA',
  'austin': 'AUS',
  'boston': 'BOS',
  'vancouver': 'YVR',
  'toronto': 'YYZ',
  'montreal': 'YUL',
  'melbourne': 'MEL',
  'auckland': 'AKL',
  'bali': 'DPS',
  'phuket': 'HKT',
};

const stampColors = ['blue', 'red', 'green', 'purple'] as const;
const stampShapes = ['circle', 'rectangle', 'oval'] as const;

export function PassportStamp({ city, country, date, onClick }: PassportStampProps) {
  // Generate deterministic but seemingly random values based on city name
  const stampConfig = useMemo(() => {
    const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % stampColors.length;
    const shapeIndex = (hash * 7) % stampShapes.length;
    const rotation = ((hash % 11) - 5); // -5 to 5 degrees

    return {
      color: stampColors[colorIndex],
      shape: stampShapes[shapeIndex],
      rotation,
    };
  }, [city]);

  // Get city abbreviation or generate one
  const cityAbbrev = useMemo(() => {
    const normalizedCity = city.toLowerCase();
    if (cityAbbreviations[normalizedCity]) {
      return cityAbbreviations[normalizedCity];
    }
    // Generate abbreviation from first 3 letters
    return city.replace(/-/g, ' ').substring(0, 3).toUpperCase();
  }, [city]);

  // Format date
  const formattedDate = useMemo(() => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }).toUpperCase();
  }, [date]);

  const rotationClass = `stamp-rotate-${stampConfig.rotation >= 0 ? stampConfig.rotation : `neg-${Math.abs(stampConfig.rotation)}`}`;
  const colorClass = `stamp-ink-${stampConfig.color}`;

  // Different stamp shapes
  const renderStampContent = () => {
    switch (stampConfig.shape) {
      case 'circle':
        return (
          <div
            className={`
              stamp-ink ${colorClass}
              w-20 h-20 md:w-24 md:h-24
              rounded-full
              border-[3px] border-dashed
              flex flex-col items-center justify-center
              p-2
            `}
          >
            <span className="passport-data text-lg md:text-xl font-bold leading-none">
              {cityAbbrev}
            </span>
            {formattedDate && (
              <span className="passport-data text-[8px] md:text-[9px] mt-1 leading-none">
                {formattedDate}
              </span>
            )}
            {country && (
              <span className="passport-data text-[7px] md:text-[8px] mt-0.5 leading-none opacity-70">
                {country}
              </span>
            )}
          </div>
        );

      case 'rectangle':
        return (
          <div
            className={`
              stamp-ink ${colorClass}
              px-3 py-2 md:px-4 md:py-3
              border-[3px]
              flex flex-col items-center justify-center
            `}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 border border-current rounded-full" />
              <span className="passport-data text-lg md:text-xl font-bold leading-none">
                {cityAbbrev}
              </span>
              <span className="w-2 h-2 border border-current rounded-full" />
            </div>
            {formattedDate && (
              <span className="passport-data text-[8px] md:text-[9px] mt-1.5 leading-none">
                {formattedDate}
              </span>
            )}
            {country && (
              <div className="passport-data text-[7px] md:text-[8px] mt-1 leading-none opacity-70 border-t border-current pt-1 px-2">
                {country}
              </div>
            )}
          </div>
        );

      case 'oval':
      default:
        return (
          <div
            className={`
              stamp-ink ${colorClass}
              w-24 h-16 md:w-28 md:h-20
              rounded-[100%]
              border-[3px] border-double
              flex flex-col items-center justify-center
              p-1
            `}
          >
            <span className="passport-data text-[6px] md:text-[7px] leading-none opacity-70">
              ENTRY
            </span>
            <span className="passport-data text-base md:text-lg font-bold leading-none mt-0.5">
              {cityAbbrev}
            </span>
            {formattedDate && (
              <span className="passport-data text-[7px] md:text-[8px] mt-0.5 leading-none">
                {formattedDate}
              </span>
            )}
          </div>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${rotationClass}
        transition-transform hover:scale-105 active:scale-95
        cursor-pointer
        inline-flex
      `}
      title={`${city}${country ? `, ${country}` : ''}${date ? ` - ${date}` : ''}`}
    >
      {renderStampContent()}
    </button>
  );
}
