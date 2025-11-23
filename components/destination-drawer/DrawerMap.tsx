'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import GoogleMap to avoid SSR issues
const GoogleMap = dynamic(() => import('@/components/GoogleMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
            </div>
        </div>
    ),
});

interface DrawerMapProps {
    latitude?: number | null;
    longitude?: number | null;
    name: string;
    address?: string;
}

export function DrawerMap({ latitude, longitude, name, address }: DrawerMapProps) {
    if (!latitude || !longitude) {
        return null;
    }

    return (
        <div className="space-y-3">
            <h3 className="font-semibold">Location</h3>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <GoogleMap
                    latitude={latitude}
                    longitude={longitude}
                    infoWindowContent={{
                        title: name,
                        address: address,
                    }}
                    showInfoWindow={true}
                    autoOpenInfoWindow={true}
                />
            </div>
        </div>
    );
}
