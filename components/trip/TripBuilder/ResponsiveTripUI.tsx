'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load components for better performance
const TripDrawer = dynamic(() => import('./TripDrawer'), { ssr: false });
const MobileTripSheet = dynamic(() => import('./MobileTripSheet'), { ssr: false });

// Planning mode components (replaces TripFloatingBar/MobileTripFloatingBar)
const PlanningBar = dynamic(() => import('../PlanningBar'), { ssr: false });
const PlanningSheet = dynamic(() => import('../PlanningSheet'), { ssr: false });

/**
 * ResponsiveTripUI - Automatically uses mobile or desktop trip components
 *
 * On mobile (< 768px):
 * - PlanningBar (replaces MobileTripFloatingBar)
 * - PlanningSheet for expanded controls
 * - MobileTripSheet for full trip editing
 *
 * On desktop (>= 768px):
 * - PlanningBar (replaces TripFloatingBar)
 * - PlanningSheet for expanded controls
 * - TripDrawer for full trip editing
 *
 * The PlanningBar handles both planning mode (blue pill with context)
 * and regular trip indicator (dark pill with trip name).
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
        {/* Planning bar - handles both planning mode and regular trip indicator */}
        <PlanningBar />
        <PlanningSheet />
        {/* Trip builder panel for full editing */}
        <MobileTripSheet />
      </>
    );
  }

  return (
    <>
      {/* Planning bar - handles both planning mode and regular trip indicator */}
      <PlanningBar />
      <PlanningSheet />
      {/* Trip builder panel for full editing */}
      <TripDrawer />
    </>
  );
}
