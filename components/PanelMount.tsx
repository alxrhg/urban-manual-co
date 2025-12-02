'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

// Import drawer content components
import AddHotelDrawer from '@/components/drawers/AddHotelDrawer';
import AddFlightDrawer from '@/components/drawers/AddFlightDrawer';
import AISuggestionsDrawer from '@/components/drawers/AISuggestionsDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/components/drawers/TripSettingsDrawer';
import AccountDrawerNew from '@/components/drawers/AccountDrawer';

// Map of drawer types to their titles
const DRAWER_TITLES: Record<string, string> = {
  'account-new': 'Account',
  'trip-list': 'Your Trips',
  'trip-settings': 'Trip Settings',
  'place-selector': 'Add Place',
  'trip-add-hotel': 'Select Hotel',
  'add-flight': 'Add Flight',
  'trip-ai': 'AI Suggestions',
};

interface PanelLayoutProps {
  children: React.ReactNode;
  defaultPanelSize?: number;
  minPanelSize?: number;
  maxPanelSize?: number;
}

/**
 * PanelLayout - Wraps page content and manages inline/overlay panel display
 *
 * Usage:
 * <PanelLayout>
 *   <YourPageContent />
 * </PanelLayout>
 */
export function PanelLayout({
  children,
  defaultPanelSize = 35,
  minPanelSize = 25,
  maxPanelSize = 50,
}: PanelLayoutProps) {
  const { open, type, props, displayMode, closeDrawer } = useDrawerStore();

  // Track if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get the panel content based on drawer type
  const panelContent = React.useMemo(() => {
    if (!open || !type) return null;

    switch (type) {
      case 'account-new':
        return <AccountDrawerNew isOpen={open} onClose={closeDrawer} />;
      case 'trip-list':
        return <TripListDrawer {...props} />;
      case 'trip-settings':
        return props?.trip ? (
          <TripSettingsDrawer
            trip={props.trip}
            onUpdate={props?.onUpdate}
            onDelete={props?.onDelete}
          />
        ) : null;
      case 'place-selector':
        return (
          <PlaceSelectorDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            city={props?.city}
            category={props?.category}
            onSelect={props?.onSelect}
            day={props?.day}
            trip={props?.trip}
            index={props?.index}
            mealType={props?.mealType}
            replaceIndex={props?.replaceIndex}
          />
        );
      case 'trip-add-hotel':
        return (
          <AddHotelDrawer
            trip={props?.trip || null}
            day={props?.day || null}
            index={props?.index}
          />
        );
      case 'add-flight':
        return (
          <AddFlightDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            onAdd={props?.onAdd}
          />
        );
      case 'trip-ai':
        return (
          <AISuggestionsDrawer
            day={props?.day || null}
            trip={props?.trip || null}
            index={props?.index}
            suggestions={props?.suggestions}
            onApply={props?.onApply}
          />
        );
      default:
        return null;
    }
  }, [open, type, props, closeDrawer]);

  const panelTitle = type ? DRAWER_TITLES[type] || '' : '';
  const shouldShowInline = displayMode === 'inline' && !isMobile && open && panelContent;

  // Desktop inline mode: split pane
  if (shouldShowInline) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content */}
        <ResizablePanel defaultSize={100 - defaultPanelSize} minSize={50}>
          <div className="h-full overflow-auto">{children}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Side Panel */}
        <ResizablePanel
          defaultSize={defaultPanelSize}
          minSize={minPanelSize}
          maxSize={maxPanelSize}
        >
          <div className="h-full flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">
            <PanelHeader title={panelTitle} onClose={closeDrawer} />
            <ScrollArea className="flex-1">{panelContent}</ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Default: just render children (overlay handled by DrawerMount)
  return <>{children}</>;
}

interface PanelHeaderProps {
  title: string;
  onClose: () => void;
}

function PanelHeader({ title, onClose }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {title}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 rounded-full"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close panel</span>
      </Button>
    </div>
  );
}

/**
 * InlinePanelContent - Renders just the panel content for custom layouts
 */
export function InlinePanelContent() {
  const { open, type, props, closeDrawer } = useDrawerStore();

  if (!open || !type) return null;

  const panelTitle = DRAWER_TITLES[type] || '';

  // Render content based on type
  let content: React.ReactNode = null;

  switch (type) {
    case 'account-new':
      content = <AccountDrawerNew isOpen={open} onClose={closeDrawer} />;
      break;
    case 'trip-list':
      content = <TripListDrawer {...props} />;
      break;
    case 'trip-settings':
      content = props?.trip ? (
        <TripSettingsDrawer
          trip={props.trip}
          onUpdate={props?.onUpdate}
          onDelete={props?.onDelete}
        />
      ) : null;
      break;
    case 'place-selector':
      content = (
        <PlaceSelectorDrawer
          tripId={props?.tripId}
          dayNumber={props?.dayNumber}
          city={props?.city}
          category={props?.category}
          onSelect={props?.onSelect}
          day={props?.day}
          trip={props?.trip}
          index={props?.index}
          mealType={props?.mealType}
          replaceIndex={props?.replaceIndex}
        />
      );
      break;
    case 'trip-add-hotel':
      content = (
        <AddHotelDrawer
          trip={props?.trip || null}
          day={props?.day || null}
          index={props?.index}
        />
      );
      break;
    case 'add-flight':
      content = (
        <AddFlightDrawer
          tripId={props?.tripId}
          dayNumber={props?.dayNumber}
          onAdd={props?.onAdd}
        />
      );
      break;
    case 'trip-ai':
      content = (
        <AISuggestionsDrawer
          day={props?.day || null}
          trip={props?.trip || null}
          index={props?.index}
          suggestions={props?.suggestions}
          onApply={props?.onApply}
        />
      );
      break;
  }

  if (!content) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      <PanelHeader title={panelTitle} onClose={closeDrawer} />
      <ScrollArea className="flex-1">{content}</ScrollArea>
    </div>
  );
}
