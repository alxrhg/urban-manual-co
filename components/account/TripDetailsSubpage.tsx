"use client";

import { Calendar, Share2, Download, Trash2 } from "lucide-react";
import Image from "next/image";
import type { Trip } from "@/types/trip";

interface TripDetailsSubpageProps {
    trip: Trip | null;
    onNavigate: (path: string) => void;
}

export function TripDetailsSubpage({ trip, onNavigate }: TripDetailsSubpageProps) {
    if (!trip) {
        return (
            <div className="px-6 py-6">
                <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trip not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 py-6 space-y-4">
            {trip.cover_image && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image
                        src={trip.cover_image}
                        alt={trip.title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>
            )}
            {trip.start_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {new Date(trip.start_date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric"
                        })}
                        {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric"
                        })}`}
                    </span>
                </div>
            )}
            <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                </button>
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => onNavigate(`/trips/${trip.id}`)}
                    className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
                >
                    Open Full Trip
                </button>
            </div>
        </div>
    );
}
