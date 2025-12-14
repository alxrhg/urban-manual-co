'use client';

import { List, Map } from 'lucide-react';

interface MobileViewToggleProps {
  activeView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

/**
 * MobileViewToggle - Floating bottom pill to switch views
 * Lovably-style navigation for mobile
 */
export default function MobileViewToggle({
  activeView,
  onViewChange,
}: MobileViewToggleProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden z-50">
      <div className="flex gap-1 bg-black/90 dark:bg-white/90 backdrop-blur-md px-2 py-2 rounded-full shadow-xl">
        <button
          onClick={() => onViewChange('list')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
            ${
              activeView === 'list'
                ? 'bg-white dark:bg-black text-black dark:text-white'
                : 'text-white/70 dark:text-black/70 hover:text-white dark:hover:text-black'
            }
          `}
        >
          <List className="w-4 h-4" />
          <span>List</span>
        </button>
        <button
          onClick={() => onViewChange('map')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
            ${
              activeView === 'map'
                ? 'bg-white dark:bg-black text-black dark:text-white'
                : 'text-white/70 dark:text-black/70 hover:text-white dark:hover:text-black'
            }
          `}
        >
          <Map className="w-4 h-4" />
          <span>Map</span>
        </button>
      </div>
    </div>
  );
}
