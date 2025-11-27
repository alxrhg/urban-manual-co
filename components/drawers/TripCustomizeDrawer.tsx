'use client';

import { useState, useEffect } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import {
  GripVertical,
  Plane,
  Calendar,
  FileText,
  CreditCard,
  Clock,
  Plus,
} from 'lucide-react';
import TripShortcuts, { ShortcutType, ALL_SHORTCUTS } from '@/components/trips/TripShortcuts';

export type WidgetType = 'next-activity' | 'itinerary' | 'documents' | 'expenses' | 'latest-added';

interface Widget {
  id: WidgetType;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'next-activity', label: 'Next Activity', icon: <Plane className="w-5 h-5 text-blue-400" />, enabled: true },
  { id: 'itinerary', label: 'Itinerary', icon: <Calendar className="w-5 h-5 text-orange-500" />, enabled: true },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5 text-gray-400" />, enabled: true },
];

const ADDITIONAL_WIDGETS: Widget[] = [
  { id: 'expenses', label: 'Expenses', icon: <CreditCard className="w-5 h-5 text-green-400" />, enabled: false },
  { id: 'latest-added', label: 'Latest Added', icon: <Clock className="w-5 h-5 text-purple-400" />, enabled: false },
];

interface TripCustomizeSettings {
  showCountryFlags: boolean;
  activeShortcuts: ShortcutType[];
  activeWidgets: WidgetType[];
  widgetOrder: WidgetType[];
}

interface TripCustomizeDrawerProps {
  settings?: Partial<TripCustomizeSettings>;
  onSave?: (settings: TripCustomizeSettings) => void;
}

export default function TripCustomizeDrawer({
  settings: initialSettings,
  onSave,
}: TripCustomizeDrawerProps) {
  const { closeDrawer } = useDrawerStore();

  const [showCountryFlags, setShowCountryFlags] = useState(
    initialSettings?.showCountryFlags ?? true
  );
  const [activeShortcuts, setActiveShortcuts] = useState<ShortcutType[]>(
    initialSettings?.activeShortcuts ?? ['flights', 'lodgings', 'places', 'routes', 'car-rental']
  );
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(
    initialSettings?.activeWidgets ?? ['next-activity', 'itinerary', 'documents']
  );

  const handleSave = () => {
    onSave?.({
      showCountryFlags,
      activeShortcuts,
      activeWidgets,
      widgetOrder: activeWidgets,
    });
    closeDrawer();
  };

  const handleAddShortcut = (id: ShortcutType) => {
    if (!activeShortcuts.includes(id)) {
      setActiveShortcuts([...activeShortcuts, id]);
    }
  };

  const handleRemoveShortcut = (id: ShortcutType) => {
    setActiveShortcuts(activeShortcuts.filter(s => s !== id));
  };

  const toggleWidget = (id: WidgetType) => {
    if (activeWidgets.includes(id)) {
      setActiveWidgets(activeWidgets.filter(w => w !== id));
    } else {
      setActiveWidgets([...activeWidgets, id]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button
          onClick={closeDrawer}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <h2 className="text-lg font-semibold text-white">Customize Overview</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-gray-900 bg-orange-500 rounded-full hover:bg-orange-400 transition-colors"
        >
          Save
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Country Flags Toggle */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-white">Show Country Flags</span>
            <button
              onClick={() => setShowCountryFlags(!showCountryFlags)}
              className={`
                relative w-14 h-8 rounded-full transition-colors duration-200
                ${showCountryFlags ? 'bg-orange-500' : 'bg-gray-700'}
              `}
            >
              <div className={`
                absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200
                ${showCountryFlags ? 'left-7' : 'left-1'}
              `}>
                {showCountryFlags && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-orange-500">
                    I
                  </span>
                )}
              </div>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            The countries are automatically detected as you add activities to your trip.
          </p>
        </div>

        {/* Shortcuts Section */}
        <div className="py-5 border-b border-gray-800">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Shortcuts
          </h3>
          <div className="bg-gray-800/50 rounded-2xl mx-4 p-4">
            <TripShortcuts
              activeShortcuts={activeShortcuts}
              editMode={true}
              onAddShortcut={handleAddShortcut}
              onRemoveShortcut={handleRemoveShortcut}
            />
          </div>
        </div>

        {/* Widgets Section */}
        <div className="py-5 border-b border-gray-800">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Widgets
          </h3>
          <div className="space-y-1 px-4">
            {DEFAULT_WIDGETS.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between py-3 px-4 bg-gray-800/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {widget.icon}
                  <span className="text-white font-medium">{widget.label}</span>
                </div>
                <GripVertical className="w-5 h-5 text-gray-500 cursor-grab" />
              </div>
            ))}
          </div>
        </div>

        {/* Add New Widgets */}
        <div className="py-5">
          <h3 className="px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Add New
          </h3>
          <div className="space-y-1 px-4">
            {ADDITIONAL_WIDGETS.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className="flex items-center justify-between w-full py-3 px-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {widget.icon}
                  <span className="text-white font-medium">{widget.label}</span>
                </div>
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-colors
                  ${activeWidgets.includes(widget.id) ? 'bg-orange-500' : 'bg-gray-700'}
                `}>
                  <Plus className={`w-4 h-4 ${activeWidgets.includes(widget.id) ? 'text-white rotate-45' : 'text-orange-500'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
