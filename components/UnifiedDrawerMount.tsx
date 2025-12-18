'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrawerStore, DrawerType } from '@/lib/stores/drawer-store';
import { Button } from '@/ui/button';
import { ScrollArea } from '@/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/ui/resizable';

// Import drawer content components
import AddHotelDrawer from '@/features/trip/components/AddHotelDrawer';
import AddFlightDrawer from '@/features/trip/components/AddFlightDrawer';
import AISuggestionsDrawer from '@/features/trip/components/AISuggestionsDrawer';
import TripListDrawer from '@/features/trip/components/TripListDrawer';
import PlaceSelectorDrawer from '@/features/trip/components/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/features/trip/components/TripSettingsDrawer';
import { AccountDrawer as AccountDrawerNew } from '@/features/account/components/AccountDrawer';
import { LoginModal } from '@/components/LoginModal';

// Map of drawer types to their titles
const DRAWER_TITLES: Record<string, string> = {
  'account-new': 'Account',
  'trip-list': 'Your Trips',
  'trip-settings': 'Trip Settings',
  'place-selector': 'Add Place',
  'trip-add-hotel': 'Select Hotel',
  'add-flight': 'Add Flight',
  'trip-ai': 'Suggestions',
  'login': 'Log In',
  'login-modal': 'Log In',
};

/**
 * UnifiedDrawerMount - The Single Truth for Drawer Rendering
 *
 * Replaces both DrawerMount.tsx (Legacy) and PanelMount.tsx (New)
 * Listens to useDrawerStore and renders the appropriate content.
 *
 * It supports:
 * 1. Overlay mode (Mobile & Modals)
 * 2. Inline mode (Desktop Split-pane)
 */
export function UnifiedDrawerMount({
  children,
  defaultPanelSize = 35,
  minPanelSize = 25,
  maxPanelSize = 50,
}: {
  children: React.ReactNode;
  defaultPanelSize?: number;
  minPanelSize?: number;
  maxPanelSize?: number;
}) {
  const { open, type, props, displayMode, closeDrawer, isOpen } = useDrawerStore();

  // Track if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine if we should show inline (Desktop + Inline Mode + Active Type)
  const shouldShowInline = displayMode === 'inline' && !isMobile && isOpen && type && isInlineCapable(type);

  // Render content
  const content = renderDrawerContent(type, props, closeDrawer);

  if (shouldShowInline) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content */}
        <ResizablePanel defaultSize={100 - defaultPanelSize} minSize={50}>
          <div className="h-full overflow-auto relative">
             {/* Overlay drawers (like modals) sit on top even in inline mode */}
             {!isInlineCapable(type) && isOpen && (
               <div className="absolute inset-0 z-50 pointer-events-none">
                 <div className="pointer-events-auto">
                    {content}
                 </div>
               </div>
             )}
             {children}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Side Panel */}
        <ResizablePanel
          defaultSize={defaultPanelSize}
          minSize={minPanelSize}
          maxSize={maxPanelSize}
        >
          <div className="h-full flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">
            <PanelHeader title={type ? DRAWER_TITLES[type] || '' : ''} onClose={closeDrawer} />
            <ScrollArea className="flex-1">{content}</ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Overlay Mode (Mobile or Global Overlay)
  return (
    <>
      {children}
      {isOpen && !shouldShowInline && (
        <OverlayDrawer type={type} onClose={closeDrawer}>
          {content}
        </OverlayDrawer>
      )}
    </>
  );
}

// Helper to determine if a drawer type *can* be inline
function isInlineCapable(type: DrawerType): boolean {
  if (!type) return false;
  // Modals that should always be overlays
  if (type === 'login' || type === 'login-modal') return false;
  return true;
}

function renderDrawerContent(type: DrawerType, props: any, onClose: () => void) {
    if (!type) return null;

    switch (type) {
      case 'account-new':
        return <AccountDrawerNew />;
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
      case 'login':
      case 'login-modal':
         return <LoginModal isOpen={true} onClose={onClose} />;

      // TODO: Add other legacy drawer types here as we migrate them

      default:
        return null;
    }
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
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

function OverlayDrawer({ children, type, onClose }: { children: React.ReactNode, type: DrawerType, onClose: () => void }) {
  // If it's a modal type, just render children (LoginModal handles its own overlay)
  if (type === 'login' || type === 'login-modal') {
     return <>{children}</>;
  }

  // Otherwise render a generic slide-over or bottom-sheet
  // For now, simple fixed overlay for mobile fallback
  return (
     <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
        <div
           className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl"
           onClick={(e) => e.stopPropagation()}
        >
           <div className="h-full flex flex-col">
              <PanelHeader title={type ? DRAWER_TITLES[type] || '' : ''} onClose={onClose} />
              <div className="flex-1 overflow-auto">
                 {children}
              </div>
           </div>
        </div>
     </div>
  );
}
