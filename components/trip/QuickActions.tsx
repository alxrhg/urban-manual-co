'use client';

import { ReactNode } from 'react';
import { MapPin, Plane, StickyNote, Map, Calendar, Users } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
}

interface QuickActionsProps {
  onAddPlace?: () => void;
  onAddFlight?: () => void;
  onAddNote?: () => void;
  onMapClick?: () => void;
  onPlannerClick?: () => void;
  onShareClick?: () => void;
  customActions?: QuickAction[];
}

/**
 * QuickActions - Editorial 3-column grid with refined hover states
 * Features asymmetric icons, subtle borders, and smooth micro-interactions
 */
export default function QuickActions({
  onAddPlace,
  onAddFlight,
  onAddNote,
  onMapClick,
  onPlannerClick,
  onShareClick,
  customActions,
}: QuickActionsProps) {
  // If new action props are provided, use them
  const newStyleActions: QuickAction[] | null = (onAddPlace || onAddFlight || onAddNote) ? [
    {
      id: 'place',
      label: 'Place',
      icon: <MapPin className="h-[18px] w-[18px]" strokeWidth={1.5} />,
      onClick: onAddPlace,
    },
    {
      id: 'flight',
      label: 'Flight',
      icon: <Plane className="h-[18px] w-[18px]" strokeWidth={1.5} />,
      onClick: onAddFlight,
    },
    {
      id: 'note',
      label: 'Note',
      icon: <StickyNote className="h-[18px] w-[18px]" strokeWidth={1.5} />,
      onClick: onAddNote,
    },
  ] : null;

  const defaultActions: QuickAction[] = [
    {
      id: 'map',
      label: 'Map',
      icon: <Map className="h-5 w-5" strokeWidth={1.5} />,
      onClick: onMapClick,
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: <Calendar className="h-5 w-5" strokeWidth={1.5} />,
      onClick: onPlannerClick,
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Users className="h-5 w-5" strokeWidth={1.5} />,
      onClick: onShareClick,
    },
  ];

  const actions = customActions || newStyleActions || defaultActions;

  return (
    <div className="grid grid-cols-3 border-y border-gray-100 dark:border-gray-800/50">
      {actions.map((action, index) => {
        const isFirst = index === 0;
        const isLast = index === actions.length - 1;

        const content = (
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-gray-500 dark:text-gray-400 transition-colors duration-200 group-hover:text-gray-900 dark:group-hover:text-white">
              {action.icon}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-gray-400 dark:text-gray-500 transition-colors duration-200 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {action.label}
            </span>
          </div>
        );

        const baseClass = `
          group relative
          py-4 px-6
          flex items-center justify-center
          bg-white dark:bg-[#0a0a0a]
          transition-all duration-200
          hover:bg-gray-50 dark:hover:bg-gray-900/50
          ${!isLast ? 'border-r border-gray-100 dark:border-gray-800/50' : ''}
        `;

        if (action.href) {
          return (
            <a
              key={action.id}
              href={action.href}
              className={baseClass}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={baseClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
