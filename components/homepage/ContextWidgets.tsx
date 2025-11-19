'use client';

import { Cloud, TrendingUp, MapPin } from 'lucide-react';

interface ContextWidget {
    type: 'weather' | 'trending' | 'near-me';
    data?: any;
}

export function ContextWidgets() {
    // TODO: Fetch real data from context-engine service

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                    <Cloud className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Weather</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Perfect for exploring
                </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trending</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Popular this week
                </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Near You</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Discover nearby
                </p>
            </div>
        </div>
    );
}
