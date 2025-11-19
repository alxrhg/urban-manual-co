'use client';

import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface DrawerHeaderProps {
    destinationSlug?: string;
    onClose: () => void;
}

export function DrawerHeader({ destinationSlug, onClose }: DrawerHeaderProps) {
    return (
        <div className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-sm font-bold uppercase tracking-wide">Destination</h2>
            <div className="flex items-center gap-2">
                {destinationSlug && (
                    <Link
                        href={`/destination/${destinationSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 min-h-11 min-w-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors touch-manipulation"
                        title="Open in new tab"
                        aria-label="Open destination in new tab"
                    >
                        <ExternalLink className="h-5 w-5" />
                    </Link>
                )}
                <button
                    onClick={onClose}
                    className="p-2.5 min-h-11 min-w-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors touch-manipulation"
                    aria-label="Close drawer"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
