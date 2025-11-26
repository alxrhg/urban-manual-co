'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, MapPin, Plane, Hotel, StickyNote, ChevronDown, Utensils, Coffee, Landmark } from 'lucide-react';

interface QuickAddMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  onClick: () => void;
}

interface QuickAddMenuProps {
  items: QuickAddMenuItem[];
  className?: string;
}

export default function QuickAddMenu({ items, className = '' }: QuickAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (item: QuickAddMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center justify-center gap-1.5 px-4 h-[38px]
          rounded-xl border text-sm font-medium transition-all duration-200
          border-black bg-black text-white hover:bg-neutral-900
          dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200
          ${isOpen ? 'ring-2 ring-black/20 dark:ring-white/20' : ''}
        `}
      >
        <Plus className="w-4 h-4" />
        <span>Add</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                  ${index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}
                `}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-defined menu items factory
export function createQuickAddItems({
  onAddPlace,
  onAddFlight,
  onAddHotel,
}: {
  onAddPlace: () => void;
  onAddFlight: () => void;
  onAddHotel?: () => void;
}): QuickAddMenuItem[] {
  const items: QuickAddMenuItem[] = [
    {
      id: 'place',
      label: 'Add Place',
      description: 'Restaurant, cafe, attraction',
      icon: <MapPin className="w-4 h-4" />,
      onClick: onAddPlace,
    },
    {
      id: 'flight',
      label: 'Add Flight',
      description: 'Flight details',
      icon: <Plane className="w-4 h-4" />,
      onClick: onAddFlight,
    },
  ];

  if (onAddHotel) {
    items.push({
      id: 'hotel',
      label: 'Add Hotel',
      description: 'Accommodation',
      icon: <Hotel className="w-4 h-4" />,
      onClick: onAddHotel,
    });
  }

  return items;
}
