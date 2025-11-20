"use client";

import { Loader2, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import type { Trip } from "@/types/trip";

interface TripsSubpageProps {
    loading: boolean;
    trips: Trip[];
    onNavigate: (path: string) => void;
    onTripSelect: (tripId: string) => void;
    onCloseDrawer: () => void;
}

export function TripsSubpage({ loading, trips, onNavigate, onTripSelect, onCloseDrawer }: TripsSubpageProps) {
    return (
        <div className="px-6 py-6 space-y-4">
            <button
                onClick={() => {
                    onCloseDrawer();
                    setTimeout(() => {
                        onNavigate('/trips');
                    }, 200);
                }}
                className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                New Trip
            </button>
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            ) : trips.length > 0 ? (
                <div className="space-y-2">
                    {trips.map((trip) => (
                        <button
                            key={trip.id}
                            onClick={() => onTripSelect(trip.id)}
                            className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
                        >
                            {trip.cover_image && (
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                    <Image
                                        src={trip.cover_image}
                                        alt={trip.title}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {trip.title}
                                </p>
                                {trip.start_date && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(trip.start_date).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No trips yet</p>
                </div>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => onNavigate("/trips")}
                    className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
                >
                    View All Trips
                </button>
            </div>
        </div>
    );
}
