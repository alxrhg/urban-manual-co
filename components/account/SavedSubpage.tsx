"use client";

import { Loader2, ChevronRight } from "lucide-react";
import Image from "next/image";

interface SavedSubpageProps {
    loading: boolean;
    savedPlaces: any[];
    onNavigate: (path: string) => void;
}

export function SavedSubpage({ loading, savedPlaces, onNavigate }: SavedSubpageProps) {
    return (
        <div className="px-6 py-6 space-y-4">
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            ) : savedPlaces.length > 0 ? (
                <div className="space-y-2">
                    {savedPlaces.map((saved, index) => (
                        <button
                            key={index}
                            onClick={() => onNavigate(`/destination/${saved.slug}`)}
                            className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
                        >
                            {saved.destination?.image && (
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                    <Image
                                        src={saved.destination.image}
                                        alt={saved.destination.name}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {saved.destination?.name || saved.slug}
                                </p>
                                {saved.destination?.city && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {saved.destination.city}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No saved places yet</p>
                </div>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => onNavigate("/account?tab=saved")}
                    className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
                >
                    View Full Saved
                </button>
            </div>
        </div>
    );
}
