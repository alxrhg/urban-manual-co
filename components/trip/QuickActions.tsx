'use client';

import { ReactNode } from 'react';
import { Map, Calendar, Users, Plane, Receipt, Settings } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
}

interface QuickActionsProps {
  tripId: string;
  onMapClick?: () => void;
  onPlannerClick?: () => void;
  onShareClick?: () => void;
  customActions?: QuickAction[];
}

/**
 * QuickActions - 3-column grid with gap-px borders
 * Lovably style: minimal icons with uppercase labels
 */
export default function QuickActions({
  tripId,
  onMapClick,
  onPlannerClick,
  onShareClick,
  customActions,
}: QuickActionsProps) {
  const defaultActions: QuickAction[] = [
    {
      id: 'map',
      label: 'Map',
      icon: <Map className="h-6 w-6" />,
      onClick: onMapClick,
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: <Calendar className="h-6 w-6" />,
      onClick: onPlannerClick,
      href: `/trips/${tripId}/planner`,
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Users className="h-6 w-6" />,
      onClick: onShareClick,
    },
  ];

  const actions = customActions || defaultActions;

  return (
    <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-800">
      {actions.map((action) => {
        const content = (
          <>
            <span className="text-gray-900 dark:text-white mb-3">
              {action.icon}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-medium text-gray-600 dark:text-gray-400">
              {action.label}
            </span>
          </>
        );

        if (action.href) {
          return (
            <a
              key={action.id}
              href={action.href}
              className="bg-white dark:bg-[#0a0a0a] p-6 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className="bg-white dark:bg-[#0a0a0a] p-6 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
