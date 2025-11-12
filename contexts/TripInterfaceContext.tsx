'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TripPlanner } from '@/components/TripPlanner';
import { TripSidebar } from '@/components/TripSidebar';

type TripPlannerDestination = {
  slug?: string | null;
  name: string;
  city?: string | null;
  category?: string | null;
  image?: string | null;
};

type OpenTripPlannerOptions = {
  tripId?: string;
  destination?: TripPlannerDestination;
  onClose?: () => void;
};

type TripInterfaceContextValue = {
  openTripPlanner: (options?: OpenTripPlannerOptions) => void;
  closeTripPlanner: () => void;
  openTripSidebar: () => void;
  closeTripSidebar: () => void;
};

const TripInterfaceContext = createContext<TripInterfaceContextValue | undefined>(
  undefined,
);

export function TripInterfaceProvider({ children }: { children: ReactNode }) {
  const [isTripPlannerOpen, setTripPlannerOpen] = useState(false);
  const [plannerTripId, setPlannerTripId] = useState<string | undefined>();
  const [plannerDestination, setPlannerDestination] = useState<TripPlannerDestination | undefined>();
  const plannerCloseCallback = useRef<(() => void) | undefined>(undefined);

  const [isTripSidebarOpen, setTripSidebarOpen] = useState(false);

  const openTripPlanner = useCallback((options?: OpenTripPlannerOptions) => {
    setPlannerTripId(options?.tripId);
    setPlannerDestination(options?.destination);
    plannerCloseCallback.current = options?.onClose;
    setTripPlannerOpen(true);
  }, []);

  const closeTripPlanner = useCallback(() => {
    setTripPlannerOpen(false);
    setPlannerTripId(undefined);
    setPlannerDestination(undefined);

    const callback = plannerCloseCallback.current;
    plannerCloseCallback.current = undefined;
    if (callback) {
      callback();
    }
  }, []);

  const openTripSidebar = useCallback(() => {
    setTripSidebarOpen(true);
  }, []);

  const closeTripSidebar = useCallback(() => {
    setTripSidebarOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      openTripPlanner,
      closeTripPlanner,
      openTripSidebar,
      closeTripSidebar,
    }),
    [openTripPlanner, closeTripPlanner, openTripSidebar, closeTripSidebar],
  );

  return (
    <TripInterfaceContext.Provider value={value}>
      {children}
      <TripSidebar isOpen={isTripSidebarOpen} onClose={closeTripSidebar} />
      <TripPlanner
        isOpen={isTripPlannerOpen}
        onClose={closeTripPlanner}
        tripId={plannerTripId}
        initialDestination={plannerDestination}
      />
    </TripInterfaceContext.Provider>
  );
}

export function useTripInterface() {
  const context = useContext(TripInterfaceContext);
  if (context === undefined) {
    throw new Error('useTripInterface must be used within a TripInterfaceProvider');
  }
  return context;
}
