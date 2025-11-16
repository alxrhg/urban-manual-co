'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { CITY_TIMEZONES } from '@/lib/constants';

interface CityClockProps {
  citySlug: string;
  className?: string;
}

export function CityClock({ citySlug, className = '' }: CityClockProps) {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get timezone for the city
    const timezone = CITY_TIMEZONES[citySlug.toLowerCase()] || 'UTC';

    const updateTime = () => {
      try {
        const now = new Date();
        const cityTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        
        // Format time (HH:MM:SS)
        const hours = cityTime.getHours().toString().padStart(2, '0');
        const minutes = cityTime.getMinutes().toString().padStart(2, '0');
        const seconds = cityTime.getSeconds().toString().padStart(2, '0');
        setTime(`${hours}:${minutes}:${seconds}`);

        // Format date (Day, Month DD, YYYY)
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        };
        const formattedDate = cityTime.toLocaleDateString('en-US', { ...options, timeZone: timezone });
        setDate(formattedDate);
      } catch (error) {
        console.error('Error updating city clock:', error);
        // Fallback to UTC
        const now = new Date();
        setTime(now.toTimeString().slice(0, 8));
        setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
      }
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [citySlug]);

  // Don't render until mounted to prevent hydration mismatch
  // Return a consistent placeholder structure on both server and client
  if (!mounted || !time) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`} aria-hidden="true">
        <Clock className="h-3 w-3" />
        <div className="flex flex-col">
          <span className="font-mono font-medium opacity-0">00:00:00</span>
          <span className="text-[10px] leading-tight opacity-0">Mon, Jan 1, 2024</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <Clock className="h-3 w-3" />
      <div className="flex flex-col">
        <span className="font-mono font-medium" suppressHydrationWarning>{time}</span>
        <span className="text-[10px] leading-tight" suppressHydrationWarning>{date}</span>
      </div>
    </div>
  );
}

