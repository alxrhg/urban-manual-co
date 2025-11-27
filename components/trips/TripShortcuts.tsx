'use client';

import { useMemo } from 'react';
import {
  Plane,
  BedDouble,
  MapPin,
  Route,
  Car,
  Train,
  UtensilsCrossed,
  Camera,
  ShoppingBag,
  Coffee,
  PartyPopper,
  Plus,
  Minus,
} from 'lucide-react';

export type ShortcutType =
  | 'flights'
  | 'lodgings'
  | 'places'
  | 'routes'
  | 'car-rental'
  | 'trains'
  | 'dining'
  | 'activities'
  | 'shopping'
  | 'cafes'
  | 'events';

interface Shortcut {
  id: ShortcutType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const ALL_SHORTCUTS: Shortcut[] = [
  {
    id: 'flights',
    label: 'Flights',
    icon: <Plane className="w-6 h-6" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  {
    id: 'lodgings',
    label: 'Lodgings',
    icon: <BedDouble className="w-6 h-6" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  {
    id: 'places',
    label: 'Places',
    icon: <MapPin className="w-6 h-6" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  },
  {
    id: 'routes',
    label: 'Routes',
    icon: <Route className="w-6 h-6" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  {
    id: 'car-rental',
    label: 'Car Rental',
    icon: <Car className="w-6 h-6" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  },
  {
    id: 'trains',
    label: 'Trains',
    icon: <Train className="w-6 h-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  {
    id: 'dining',
    label: 'Dining',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20'
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: <Camera className="w-6 h-6" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20'
  },
  {
    id: 'cafes',
    label: 'Cafes',
    icon: <Coffee className="w-6 h-6" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  },
  {
    id: 'events',
    label: 'Events',
    icon: <PartyPopper className="w-6 h-6" />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20'
  },
];

interface TripShortcutsProps {
  activeShortcuts?: ShortcutType[];
  editMode?: boolean;
  onShortcutClick?: (shortcut: ShortcutType) => void;
  onAddShortcut?: (shortcut: ShortcutType) => void;
  onRemoveShortcut?: (shortcut: ShortcutType) => void;
  className?: string;
}

export default function TripShortcuts({
  activeShortcuts = ['flights', 'lodgings', 'places', 'routes', 'car-rental'],
  editMode = false,
  onShortcutClick,
  onAddShortcut,
  onRemoveShortcut,
  className = '',
}: TripShortcutsProps) {
  const displayedShortcuts = useMemo(() => {
    if (editMode) {
      return ALL_SHORTCUTS;
    }
    return ALL_SHORTCUTS.filter(s => activeShortcuts.includes(s.id));
  }, [activeShortcuts, editMode]);

  const handleClick = (shortcut: Shortcut) => {
    if (editMode) {
      if (activeShortcuts.includes(shortcut.id)) {
        onRemoveShortcut?.(shortcut.id);
      } else {
        onAddShortcut?.(shortcut.id);
      }
    } else {
      onShortcutClick?.(shortcut.id);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-2">
        {displayedShortcuts.map((shortcut) => {
          const isActive = activeShortcuts.includes(shortcut.id);

          return (
            <button
              key={shortcut.id}
              onClick={() => handleClick(shortcut)}
              className={`
                flex flex-col items-center gap-2 min-w-[70px] group transition-all duration-200
                ${editMode && !isActive ? 'opacity-50' : ''}
              `}
            >
              <div className={`
                relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200
                ${shortcut.bgColor} ${shortcut.color}
                ${!editMode ? 'group-hover:scale-110 group-active:scale-95' : ''}
              `}>
                {shortcut.icon}

                {/* Edit Mode Badge */}
                {editMode && (
                  <div className={`
                    absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
                    ${isActive ? 'bg-red-500' : 'bg-gray-600'}
                    text-white text-xs
                  `}>
                    {isActive ? (
                      <Minus className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>

              <span className={`
                text-xs font-medium text-center
                ${editMode ? 'text-gray-400' : 'text-gray-300'}
              `}>
                {shortcut.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add New Shortcut Button (Edit Mode) */}
      {editMode && (
        <div className="px-4 mt-4">
          <button className="flex items-center gap-2 text-orange-500 text-sm font-medium hover:text-orange-400 transition-colors">
            <Plus className="w-4 h-4" />
            Add New Shortcut
          </button>
        </div>
      )}
    </div>
  );
}

// Export the shortcut types for use in other components
export { ALL_SHORTCUTS };
