'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load components for better performance
const TripDrawer = dynamic(() => import('./TripDrawer'), { ssr: false });
const TripFloatingBar = dynamic(() => import('./TripFloatingBar'), { ssr: false });
const MobileTripSheet = dynamic(() => import('./MobileTripSheet'), { ssr: false });
const MobileTripFloatingBar = dynamic(() => import('./MobileTripFloatingBar'), { ssr: false });

// Planning mode components
const PlanningBar = dynamic(() => import('../PlanningBar'), { ssr: false });
const PlanningSheet = dynamic(() => import('../PlanningSheet'), { ssr: false });

/**
 * ResponsiveTripUI - Automatically uses mobile or desktop trip components
 *
 * On mobile (< 768px):
 * - MobileTripFloatingBar with thumbnail previews
 * - MobileTripSheet with swipe gestures and day navigation
 *
 * On desktop (>= 768px):
 * - TripFloatingBar (minimal pill)
 * - TripDrawer (bottom sheet)
 *
 * Planning Mode (all devices):
 * - PlanningBar (collapsed) - bottom pill showing trip context
 * - PlanningSheet (expanded) - city scope, day picker, quick actions
 *
 * This component handles the switching automatically based on viewport width.
 */
export default function ResponsiveTripUI() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if window is available (client-side)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render until we know the viewport size
  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <>
        {/* Planning mode UI - shown when planning mode is active */}
        <PlanningBar />
        <PlanningSheet />
        {/* Trip builder panel */}
        <MobileTripFloatingBar />
        <MobileTripSheet />
      </>
    );
  }

  return (
    <>
      {/* Planning mode UI - shown when planning mode is active */}
      <PlanningBar />
      <PlanningSheet />
      {/* Trip builder panel */}
      <TripFloatingBar />
      <TripDrawer />
    </>
  );
}
