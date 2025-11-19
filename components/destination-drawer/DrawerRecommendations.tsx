'use client';

import Image from 'next/image';
import { Sparkles, Loader2 } from 'lucide-react';
import { getDestinationImageUrl } from '@/lib/destination-images';

interface Recommendation {
    slug: string;
    name: string;
    city: string;
    category: string;
    image: string | null;
    michelin_stars: number | null;
    crown: boolean;
}

interface DrawerRecommendationsProps {
    recommendations: Recommendation[];
    loading: boolean;
    onRecommendationClick: (slug: string) => void;
}

export function DrawerRecommendations({
    recommendations,
    loading,
    onRecommendationClick,
}: DrawerRecommendationsProps) {
    if (loading) {
        return (
            <div className="py-8">
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading recommendations...</span>
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null;
    }

    const capitalizeCity = (city: string) => {
        return city
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-semibold">You might also like</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {recommendations.map((rec) => {
                    const imageUrl = getDestinationImageUrl(rec as any);

                    return (
                        <button
                            key={rec.slug}
                            onClick={() => onRecommendationClick(rec.slug)}
                            className="group text-left"
                        >
                            {/* Image */}
                            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 relative">
                                {imageUrl ? (
                                    <Image
                                        src={imageUrl}
                                        alt={rec.name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 240px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                                        <span className="text-4xl">📍</span>
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex gap-1">
                                    {rec.crown && <span className="text-lg">👑</span>}
                                    {rec.michelin_stars && rec.michelin_stars > 0 && (
                                        <div className="bg-white/90 dark:bg-black/90 px-1.5 py-0.5 rounded text-xs font-bold">
                                            {'⭐'.repeat(rec.michelin_stars)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <h4 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                {rec.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {capitalizeCity(rec.city)}
                                {rec.category && ` • ${rec.category}`}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
