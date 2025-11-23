'use client';

import { useState } from 'react';
import { MapInterface } from '@/components/homepage/MapInterface';
import { Destination } from '@/types/destination';

// Sample destinations for demo
const sampleDestinations: Destination[] = [
    {
        id: 1,
        slug: 'narisawa',
        name: 'Narisawa',
        city: 'tokyo',
        category: 'restaurant',
        latitude: 35.6684,
        longitude: 139.7280,
        michelin_stars: 2,
        crown: true,
        description: 'Innovative Japanese cuisine',
        image: undefined,
    },
    {
        id: 2,
        slug: 'blue-bottle-roppongi',
        name: 'Blue Bottle Coffee',
        city: 'tokyo',
        category: 'cafe',
        latitude: 35.6627,
        longitude: 139.7295,
        michelin_stars: undefined,
        crown: false,
        description: 'Specialty coffee',
        image: undefined,
    },
    {
        id: 3,
        slug: 'park-hyatt-tokyo',
        name: 'Park Hyatt Tokyo',
        city: 'tokyo',
        category: 'hotel',
        latitude: 35.6852,
        longitude: 139.6917,
        michelin_stars: undefined,
        crown: true,
        description: 'Luxury hotel in Shinjuku',
        image: undefined,
    },
];

export default function MapDemoPage() {
    const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <div className="bg-white dark:bg-gray-950 text-black dark:text-white min-h-screen">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Interactive Map Demo</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Click markers to select destinations
                            </p>
                        </div>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {darkMode ? '☀️ Light' : '🌙 Dark'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Map */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                                <h2 className="text-lg font-semibold mb-4">Map View</h2>
                                <MapInterface
                                    destinations={sampleDestinations}
                                    selectedDestination={selectedDestination}
                                    onMarkerClick={(dest) => {
                                        setSelectedDestination(dest);
                                        console.log('Selected:', dest);
                                    }}
                                    darkMode={darkMode}
                                />
                            </div>
                        </div>

                        {/* Selected Destination Info */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sticky top-6">
                                <h2 className="text-lg font-semibold mb-4">Selected Destination</h2>
                                {selectedDestination ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">{selectedDestination.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                {selectedDestination.city} • {selectedDestination.category}
                                            </p>
                                        </div>

                                        {selectedDestination.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {selectedDestination.description}
                                            </p>
                                        )}

                                        <div className="flex gap-2">
                                            {selectedDestination.crown && (
                                                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full">
                                                    👑 Featured
                                                </span>
                                            )}
                                            {selectedDestination.michelin_stars && (
                                                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full">
                                                    {'⭐'.repeat(selectedDestination.michelin_stars)} Michelin
                                                </span>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Lat: {selectedDestination.latitude?.toFixed(4)}<br />
                                                Lng: {selectedDestination.longitude?.toFixed(4)}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Click a marker on the map to see details
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                            ℹ️ How to use
                        </h3>
                        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                            <li>• <strong>Click markers</strong> to select destinations</li>
                            <li>• <strong>Hover markers</strong> to see quick info</li>
                            <li>• <strong>Drag map</strong> to pan around</li>
                            <li>• <strong>Scroll</strong> to zoom in/out</li>
                            <li>• <strong>Toggle dark mode</strong> to see style changes</li>
                        </ul>
                    </div>

                    {/* Note about Mapbox Token */}
                    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                            ⚠️ Mapbox Token Required
                        </h3>
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                            To see the map, add your Mapbox token to <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">.env.local</code>:
                        </p>
                        <pre className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs overflow-x-auto">
                            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-token-here
                        </pre>
                        <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
                            Get a free token at: <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="underline">account.mapbox.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
