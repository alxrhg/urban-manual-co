'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Route,
  Calendar,
  Share2,
  Download,
  MapPin,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';
import type { DayWeather } from '@/lib/hooks/useWeather';
import ScheduleConflicts from './ScheduleConflicts';
import RouteVisualization from './RouteVisualization';
import ReservationHub from './ReservationHub';
import SmartSidebar from './SmartSidebar';
import ExportMenu from './ExportMenu';
import CollaborationPanel from './CollaborationPanel';

type TabType = 'suggestions' | 'conflicts' | 'route' | 'reservations' | 'share' | 'export';

interface TripIntelligencePanelProps {
  trip: Trip;
  days: TripDay[];
  selectedDayNumber: number;
  city: string;
  weatherByDate?: Record<string, DayWeather>;
  curatedDestinations?: Destination[];
  onOptimizeRoute?: (dayNumber: number, optimizedItems: EnrichedItineraryItem[]) => void;
  onAddPlace?: (destination: Destination, dayNumber: number) => void;
  onUpdateItemTime?: (itemId: string, newTime: string) => void;
  onUpdateItem?: (itemId: string, updates: Record<string, unknown>) => void;
  onOpenSearch?: () => void;
  compact?: boolean;
  className?: string;
}

export default function TripIntelligencePanel({
  trip,
  days,
  selectedDayNumber,
  city,
  weatherByDate = {},
  curatedDestinations = [],
  onOptimizeRoute,
  onAddPlace,
  onUpdateItemTime,
  onUpdateItem,
  onOpenSearch,
  compact = false,
  className = '',
}: TripIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Calculate conflict count for badge
  const { conflictCount, warningCount } = useMemo(() => {
    let conflicts = 0;
    let warnings = 0;

    days.forEach(day => {
      const items = day.items.filter(item => item.time).sort((a, b) => {
        const parseTime = (t: string | null) => {
          if (!t) return 0;
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        return parseTime(a.time) - parseTime(b.time);
      });

      for (let i = 0; i < items.length - 1; i++) {
        const current = items[i];
        const next = items[i + 1];
        const parseTime = (t: string | null) => {
          if (!t) return 0;
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const currentStart = parseTime(current.time);
        const nextStart = parseTime(next.time);
        const duration = current.parsedNotes?.duration || 60;

        if (currentStart + duration > nextStart) {
          conflicts++;
        } else if (currentStart + duration + 15 > nextStart) {
          warnings++;
        }
      }
    });

    return { conflictCount: conflicts, warningCount: warnings };
  }, [days]);

  // Get current day items
  const selectedDay = days.find(d => d.dayNumber === selectedDayNumber);
  const selectedDayItems = selectedDay?.items || [];

  // Handle route optimization
  const handleOptimizeRoute = async (optimizedItems: EnrichedItineraryItem[]) => {
    if (!onOptimizeRoute) return;
    setIsOptimizing(true);
    try {
      await onOptimizeRoute(selectedDayNumber, optimizedItems);
    } finally {
      setIsOptimizing(false);
    }
  };

  const tabs: { id: TabType; icon: React.ReactNode; label: string; badge?: number }[] = [
    {
      id: 'suggestions',
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Suggestions',
    },
    {
      id: 'conflicts',
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Conflicts',
      badge: conflictCount + warningCount,
    },
    {
      id: 'route',
      icon: <Route className="w-4 h-4" />,
      label: 'Route',
    },
    {
      id: 'reservations',
      icon: <Calendar className="w-4 h-4" />,
      label: 'Reservations',
    },
    {
      id: 'share',
      icon: <Share2 className="w-4 h-4" />,
      label: 'Share',
    },
    {
      id: 'export',
      icon: <Download className="w-4 h-4" />,
      label: 'Export',
    },
  ];

  if (compact) {
    // Compact mode - just show summary badges
    return (
      <div className={`p-3 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-[12px] font-medium text-gray-900 dark:text-white">
            Trip Intelligence
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Conflicts badge */}
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`p-2 rounded-lg text-center transition-colors ${
              conflictCount > 0
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-green-50 dark:bg-green-900/20'
            }`}
          >
            {conflictCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
            )}
            <span className={`text-[10px] font-medium ${
              conflictCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {conflictCount > 0 ? `${conflictCount} conflict${conflictCount > 1 ? 's' : ''}` : 'No conflicts'}
            </span>
          </button>

          {/* Route badge */}
          <button
            onClick={() => setActiveTab('route')}
            className="p-2 rounded-lg text-center bg-blue-50 dark:bg-blue-900/20"
          >
            <Route className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
              View route
            </span>
          </button>

          {/* Suggestions badge */}
          <button
            onClick={() => setActiveTab('suggestions')}
            className="p-2 rounded-lg text-center bg-purple-50 dark:bg-purple-900/20"
          >
            <Sparkles className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
              Suggestions
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Tab navigation */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium whitespace-nowrap transition-colors relative ${
              activeTab === tab.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-2 right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[60vh] overflow-y-auto">
        {activeTab === 'suggestions' && (
          <SmartSidebar
            days={days}
            city={city}
            selectedDayNumber={selectedDayNumber}
            curatedDestinations={curatedDestinations}
            onAddPlace={onAddPlace}
            onOpenSearch={onOpenSearch}
          />
        )}

        {activeTab === 'conflicts' && (
          <ScheduleConflicts
            days={days}
            onUpdateItemTime={onUpdateItemTime}
            onOptimizeRoute={(dayNumber) => {
              // Trigger route optimization for the day
              const day = days.find(d => d.dayNumber === dayNumber);
              if (day && onOptimizeRoute) {
                onOptimizeRoute(dayNumber, day.items);
              }
            }}
          />
        )}

        {activeTab === 'route' && selectedDayItems.length > 0 && (
          <div className="p-4">
            <RouteVisualization
              items={selectedDayItems}
              dayNumber={selectedDayNumber}
              onOptimizeRoute={handleOptimizeRoute}
              isOptimizing={isOptimizing}
            />
          </div>
        )}

        {activeTab === 'route' && selectedDayItems.length === 0 && (
          <div className="p-6 text-center">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">
              Add places to Day {selectedDayNumber} to see the route
            </p>
          </div>
        )}

        {activeTab === 'reservations' && (
          <ReservationHub
            trip={trip}
            days={days}
            onUpdateItem={onUpdateItem}
          />
        )}

        {activeTab === 'share' && (
          <CollaborationPanel
            trip={trip}
          />
        )}

        {activeTab === 'export' && (
          <ExportMenu
            trip={trip}
            days={days}
          />
        )}
      </div>
    </div>
  );
}
