'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Destination } from '@/types/destination';

// Dynamically import map components to avoid SSR issues
const AppleMapView = dynamic(
    () => import('@/components/maps/AppleMapView'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading Apple Maps...</div>
            </div>
        )
    }
);

const InteractiveMapView = dynamic(
    () => import('@/components/maps/InteractiveMapView').then(mod => ({ default: mod.InteractiveMapView })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading map...</div>
            </div>
        )
    }
);

interface MapInterfaceProps {
    destinations?: Destination[];
    selectedDestination?: Destination | null;
    onMarkerClick?: (destination: Destination) => void;
    darkMode?: boolean;
}

export function MapInterface({
    destinations = [],
    selectedDestination,
    onMarkerClick,
    darkMode = false
}: MapInterfaceProps) {
    const [useMapbox, setUseMapbox] = useState(false);

    const handleAppleMapError = (error: string) => {
        console.log('Apple Maps failed, falling back to Mapbox:', error);
        setUseMapbox(true);
    };

    return (
        <div className="w-full h-[400px] md:h-[500px] lg:h-[600px]">
            {!useMapbox ? (
                <AppleMapView
                    destinations={destinations}
                    onMarkerClick={onMarkerClick}
                    isDark={darkMode}
                    onProviderError={handleAppleMapError}
                />
            ) : (
                <InteractiveMapView
                    destinations={destinations}
                    selectedDestination={selectedDestination}
                    onMarkerClick={onMarkerClick}
                    darkMode={darkMode}
                    className="w-full h-full"
                />
            )}
        </div>
    );
}
