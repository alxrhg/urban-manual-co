'use client';

import { useEffect, useCallback, memo, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDrawerStore, type DrawerConfig, type DrawerType } from '@/lib/stores/drawer-store';
import { cn } from '@/lib/utils';
import { DrawerShell } from './DrawerShell';
import { DrawerBackdrop } from './DrawerBackdrop';

// ============================================================================
// Lazy-loaded drawer content components
// ============================================================================

const AccountDrawerContent = lazy(() => import('./AccountDrawer'));
const TripListDrawerContent = lazy(() => import('./TripListDrawer'));
const TripOverviewDrawerContent = lazy(() => import('./TripOverviewDrawer'));
const TripOverviewQuickDrawerContent = lazy(() => import('./TripOverviewQuickDrawer'));
const TripSettingsDrawerContent = lazy(() => import('./TripSettingsDrawer'));
const PlaceSelectorDrawerContent = lazy(() => import('./PlaceSelectorDrawer'));
const AddHotelDrawerContent = lazy(() => import('./AddHotelDrawer'));
const AddFlightDrawerContent = lazy(() => import('./AddFlightDrawer'));
const AISuggestionsDrawerContent = lazy(() => import('./AISuggestionsDrawer'));

// Lazily import destination drawer
const DestinationDrawerContent = lazy(() =>
  import('@/src/features/detail/DestinationDrawer').then(mod => ({
    default: mod.DestinationDrawer as React.ComponentType<any>
  }))
);

// ============================================================================
// Drawer Title Mapping
// ============================================================================

const DRAWER_TITLES: Record<string, string> = {
  'destination': 'Details',
  'account': 'Account',
  'account-new': 'Account',
  'login': 'Sign In',
  'chat': 'Chat',
  'trips': 'Trips',
  'trip-list': 'Your Trips',
  'trip-overview': 'Trip Overview',
  'trip-overview-quick': 'Trip Preview',
  'trip-settings': 'Trip Settings',
  'trip-ai': 'AI Suggestions',
  'trip-add-hotel': 'Select Hotel',
  'place-selector': 'Add Place',
  'add-flight': 'Add Flight',
  'saved-places': 'Saved Places',
  'visited-places': 'Visited Places',
  'settings': 'Settings',
  'poi': 'Point of Interest',
  'map': 'Map',
  'create-trip': 'Create Trip',
  'quick-trip-selector': 'Add to Trip',
  'search': 'Search',
  'filters': 'Filters',
  'share': 'Share',
};

// ============================================================================
// Loading Fallback
// ============================================================================

function DrawerLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Drawer Content Router
// ============================================================================

interface DrawerContentProps {
  drawer: DrawerConfig;
  onClose: () => void;
}

const DrawerContent = memo(function DrawerContent({ drawer, onClose }: DrawerContentProps) {
  const { type, props } = drawer;

  return (
    <Suspense fallback={<DrawerLoadingFallback />}>
      {type === 'destination' && (
        <DestinationDrawerContent
          isOpen={true}
          onClose={onClose}
          destination={props?.place || props?.destination || null}
          renderMode={drawer.displayMode === 'inline' ? 'inline' : 'overlay'}
          {...props}
        />
      )}

      {(type === 'account' || type === 'account-new') && (
        <AccountDrawerContent
          isOpen={true}
          onClose={onClose}
        />
      )}

      {type === 'trip-list' && (
        <TripListDrawerContent {...props} />
      )}

      {type === 'trip-overview' && (
        <TripOverviewDrawerContent
          isOpen={true}
          onClose={onClose}
          trip={props?.trip ?? null}
        />
      )}

      {type === 'trip-overview-quick' && (
        <TripOverviewQuickDrawerContent
          isOpen={true}
          onClose={onClose}
          trip={props?.trip || null}
        />
      )}

      {type === 'trip-settings' && props?.trip ? (
        <TripSettingsDrawerContent
          trip={props.trip as any}
          onUpdate={props?.onUpdate as any}
          onDelete={props?.onDelete as any}
        />
      ) : null}

      {type === 'place-selector' && (
        <PlaceSelectorDrawerContent
          tripId={props?.tripId as string}
          dayNumber={props?.dayNumber as number}
          city={props?.city as string}
          category={props?.category as string}
          onSelect={props?.onSelect as any}
          day={props?.day as any}
          trip={props?.trip as any}
          index={props?.index as number}
          mealType={props?.mealType as string}
          replaceIndex={props?.replaceIndex as number}
        />
      )}

      {type === 'trip-add-hotel' && (
        <AddHotelDrawerContent
          trip={props?.trip as any || null}
          day={props?.day as any || null}
          index={props?.index as number}
        />
      )}

      {type === 'add-flight' && (
        <AddFlightDrawerContent
          tripId={props?.tripId as string}
          dayNumber={props?.dayNumber as number}
          onAdd={props?.onAdd as any}
        />
      )}

      {type === 'trip-ai' && (
        <AISuggestionsDrawerContent
          day={props?.day as any || null}
          trip={props?.trip as any || null}
          index={props?.index as number}
          suggestions={props?.suggestions as any}
          onApply={props?.onApply as any}
        />
      )}
    </Suspense>
  );
});

// ============================================================================
// Drawer Manager Component
// ============================================================================

interface DrawerManagerProps {
  /** Whether to render in inline mode (split pane) */
  inlineMode?: boolean;
}

export function DrawerManager({ inlineMode = false }: DrawerManagerProps) {
  const stack = useDrawerStore((state) => state.stack);
  const isAnimating = useDrawerStore((state) => state.isAnimating);
  const close = useDrawerStore((state) => state.close);
  const closeAll = useDrawerStore((state) => state.closeAll);
  const goBack = useDrawerStore((state) => state.goBack);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape' && stack.length > 0) {
        e.preventDefault();
        if (stack.length > 1) {
          goBack();
        } else {
          close();
        }
      }

      // Go back on Backspace (when not in input)
      if (e.key === 'Backspace' && stack.length > 1) {
        const target = e.target as HTMLElement;
        if (!['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.isContentEditable) {
          e.preventDefault();
          goBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack.length, close, goBack]);

  // Body scroll lock
  useEffect(() => {
    const hasOverlay = stack.some(d => d.displayMode === 'overlay' || d.displayMode === 'fullscreen');

    if (hasOverlay) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [stack]);

  // Filter drawers by display mode
  const overlayDrawers = stack.filter(d => d.displayMode === 'overlay' || d.displayMode === 'fullscreen');
  const inlineDrawer = inlineMode ? stack.find(d => d.displayMode === 'inline') : null;

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    const topDrawer = overlayDrawers[overlayDrawers.length - 1];
    if (topDrawer?.dismissible) {
      close();
    }
  }, [overlayDrawers, close]);

  return (
    <>
      {/* Overlay Drawers */}
      <AnimatePresence mode="sync">
        {overlayDrawers.length > 0 && (
          <DrawerBackdrop
            key="backdrop"
            isVisible={true}
            onClick={handleBackdropClick}
            zIndex={40}
          />
        )}

        {overlayDrawers.map((drawer, index) => (
          <DrawerShell
            key={drawer.id}
            drawer={drawer}
            title={DRAWER_TITLES[drawer.type || ''] || ''}
            onClose={close}
            onBack={stack.length > 1 ? goBack : undefined}
            zIndex={50 + index}
            isTopmost={index === overlayDrawers.length - 1}
          >
            <DrawerContent drawer={drawer} onClose={close} />
          </DrawerShell>
        ))}
      </AnimatePresence>

      {/* Inline Drawer (rendered elsewhere via portal) */}
      {inlineDrawer && (
        <DrawerContent drawer={inlineDrawer} onClose={close} />
      )}
    </>
  );
}

// ============================================================================
// Inline Panel Content Export
// ============================================================================

export function InlineDrawerContent() {
  const inlineDrawer = useDrawerStore((state) =>
    state.stack.find(d => d.displayMode === 'inline')
  );
  const close = useDrawerStore((state) => state.close);

  if (!inlineDrawer) return null;

  return <DrawerContent drawer={inlineDrawer} onClose={close} />;
}

export default DrawerManager;
