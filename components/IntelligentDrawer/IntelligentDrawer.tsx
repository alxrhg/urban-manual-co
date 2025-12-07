'use client';

import { useCallback, memo } from 'react';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import DrawerShell from './DrawerShell';
import DestinationContent from './DestinationContent';
import SimilarContent from './SimilarContent';
import WhyThisContent from './WhyThisContent';
import { DrawerMode, DrawerContext } from './types';

/**
 * IntelligentDrawer - Universal intelligent drawer
 *
 * A unified drawer system that handles all drawer types:
 * - Destination details with trip integration
 * - Similar places discovery
 * - Why this explanations
 * - And extensible for more content types
 *
 * Features:
 * - Smooth navigation between modes
 * - History support (back button)
 * - Intelligent context awareness
 * - Trip builder integration
 */
const IntelligentDrawer = memo(function IntelligentDrawer() {
  const { state, close, back, navigate, canGoBack } = useIntelligentDrawer();
  const { isOpen, mode, context, size } = state;

  // Handle navigation to different modes
  const handleNavigate = useCallback(
    (newMode: DrawerMode, newContext: DrawerContext) => {
      navigate(newMode, newContext);
    },
    [navigate]
  );

  // Handle opening a related destination
  const handleOpenRelated = useCallback(
    (destination: any) => {
      handleNavigate('destination', { destination });
    },
    [handleNavigate]
  );

  // Handle showing similar places
  const handleShowSimilar = useCallback(() => {
    if (context.destination) {
      handleNavigate('similar', { destination: context.destination });
    }
  }, [handleNavigate, context.destination]);

  // Handle showing why this
  const handleShowWhyThis = useCallback(() => {
    if (context.destination) {
      handleNavigate('why-this', {
        destination: context.destination,
        whyThis: context.whyThis,
      });
    }
  }, [handleNavigate, context.destination, context.whyThis]);

  // Handle add to trip (placeholder - would integrate with TripBuilder)
  const handleAddToTrip = useCallback((destination: any, day?: number) => {
    // This would be handled by the content component using useTripBuilder
    console.log('Add to trip:', destination.name, 'day:', day);
  }, []);

  // Get title based on mode
  const getTitle = () => {
    switch (mode) {
      case 'similar':
        return 'Similar Places';
      case 'why-this':
        return 'Why This?';
      case 'destination':
        return context.destination?.name;
      default:
        return '';
    }
  };

  // Get subtitle based on mode
  const getSubtitle = () => {
    switch (mode) {
      case 'destination':
        return context.destination?.city;
      case 'similar':
        return `Places like ${context.destination?.name}`;
      case 'why-this':
        return 'AI Recommendation';
      default:
        return '';
    }
  };

  // Render content based on mode
  const renderContent = () => {
    switch (mode) {
      case 'destination':
        if (!context.destination) return null;
        return (
          <DestinationContent
            destination={context.destination}
            related={context.related}
            whyThis={context.whyThis}
            tripContext={
              context.tripDay
                ? { day: context.tripDay, fit: context.tripFit }
                : undefined
            }
            onOpenRelated={handleOpenRelated}
            onShowSimilar={handleShowSimilar}
            onShowWhyThis={handleShowWhyThis}
          />
        );

      case 'similar':
        if (!context.destination) return null;
        return (
          <SimilarContent
            destination={context.destination}
            onSelectDestination={handleOpenRelated}
            onAddToTrip={handleAddToTrip}
          />
        );

      case 'why-this':
        if (!context.destination) return null;
        return (
          <WhyThisContent
            destination={context.destination}
            initialExplanation={context.whyThis}
          />
        );

      default:
        return (
          <div className="p-5 text-center text-gray-500">
            Unknown drawer mode: {mode}
          </div>
        );
    }
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      size={size}
      position="right"
      onClose={close}
      onBack={canGoBack ? back : undefined}
      canGoBack={canGoBack}
      title={getTitle()}
      subtitle={getSubtitle()}
    >
      {renderContent()}
    </DrawerShell>
  );
});

export default IntelligentDrawer;
