'use client';

import { useEffect, useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { QuickTripSelector } from '@/components/QuickTripSelector';

import AddHotelDrawer from '@/components/drawers/AddHotelDrawer';
import AddFlightDrawer from '@/components/drawers/AddFlightDrawer';
import AISuggestionsDrawer from '@/components/drawers/AISuggestionsDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import TripOverviewDrawer from '@/components/drawers/TripOverviewDrawer';
import TripOverviewQuickDrawer from '@/components/drawers/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/components/drawers/TripSettingsDrawer';
import AccountDrawerNew from '@/components/drawers/AccountDrawer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plane, Settings, MapPin, PlusCircle, Sparkles } from 'lucide-react';

// Types that are handled by inline PanelLayout on desktop
const INLINE_TYPES = ['destination', 'account-new', 'trip-list', 'trip-settings', 'place-selector', 'trip-add-hotel', 'add-flight', 'trip-ai'];

function DrawerHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 p-6 pb-4">
      <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h1>
    </div>
  );
}

export default function DrawerMount() {
  const { open, type, props, closeDrawer, displayMode } = useDrawerStore();

  // Track desktop state for conditional rendering
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Helper to check if we should skip overlay (handled by PanelLayout instead)
  const shouldSkipOverlay = (drawerType: string) => {
    return displayMode === 'inline' && isDesktop && INLINE_TYPES.includes(drawerType);
  };

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <AccountDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />
      <SettingsDrawer />

      {/* New drawers that use the global drawer store */}
      {/* Only render as overlay if not in inline mode on desktop */}
      {open && type === 'account-new' && !shouldSkipOverlay('account-new') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <AccountDrawerNew isOpen={open} onClose={closeDrawer} />
          </SheetContent>
        </Sheet>
      )}

      {/* DestinationDrawer - skip overlay when in inline mode on desktop */}
      {!shouldSkipOverlay('destination') && (
        <DestinationDrawer
          isOpen={open && type === 'destination'}
          onClose={closeDrawer}
          destination={props.place || props.destination || null}
          {...props}
        />
      )}

      <TripOverviewDrawer
        isOpen={open && type === 'trip-overview'}
        onClose={closeDrawer}
        trip={props?.trip ?? null}
      />

      {open && type === 'trip-list' && !shouldSkipOverlay('trip-list') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <DrawerHeader icon={Plane} title="Your Trips" />
            <ScrollArea className="flex-1">
              <TripListDrawer {...props} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      <TripOverviewQuickDrawer
        isOpen={open && type === 'trip-overview-quick'}
        onClose={closeDrawer}
        trip={props.trip || null}
      />

      {open && type === 'trip-settings' && props?.trip && !shouldSkipOverlay('trip-settings') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <DrawerHeader icon={Settings} title="Trip Settings" />
            <ScrollArea className="flex-1">
              <TripSettingsDrawer
                trip={props.trip}
                onUpdate={props?.onUpdate}
                onDelete={props?.onDelete}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {open && type === 'place-selector' && !shouldSkipOverlay('place-selector') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <DrawerHeader icon={PlusCircle} title="Add Place" />
            <ScrollArea className="flex-1">
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
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {open && type === 'trip-add-hotel' && !shouldSkipOverlay('trip-add-hotel') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <DrawerHeader icon={MapPin} title="Select Hotel" />
            <ScrollArea className="flex-1">
              <AddHotelDrawer
                trip={props.trip || null}
                day={props.day || null}
                index={props.index}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {open && type === 'add-flight' && !shouldSkipOverlay('add-flight') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
            <DrawerHeader icon={Plane} title="Add Flight" />
            <ScrollArea className="flex-1">
              <AddFlightDrawer
                tripId={props?.tripId}
                dayNumber={props?.dayNumber}
                onAdd={props?.onAdd}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {open && type === 'trip-ai' && !shouldSkipOverlay('trip-ai') && (
        <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
          <SheetContent side="card-right" className="flex flex-col p-0 max-w-2xl" hideCloseButton>
            <DrawerHeader icon={Sparkles} title="AI Suggestions" />
            <ScrollArea className="flex-1">
              <AISuggestionsDrawer
                day={props.day || null}
                trip={props.trip || null}
                index={props.index}
                suggestions={props.suggestions}
                onApply={props.onApply}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Quick Trip Selector - for one-click add to trip */}
      <QuickTripSelector
        isOpen={open && type === 'quick-trip-selector'}
        onClose={closeDrawer}
        destinationSlug={props?.destinationSlug || ''}
        destinationName={props?.destinationName || ''}
        destinationCity={props?.destinationCity}
      />
    </>
  );
}
