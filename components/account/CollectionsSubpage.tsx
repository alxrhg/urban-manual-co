"use client";

import { Loader2, ChevronRight } from "lucide-react";
import type { Collection } from "@/types/common";

interface CollectionsSubpageProps {
    loading: boolean;
    collections: Collection[];
    onNavigate: (path: string) => void;
}

export function CollectionsSubpage({ loading, collections, onNavigate }: CollectionsSubpageProps) {
    return (
        <div className="px-6 py-6 space-y-4">
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading collections...</p>
                </div>
            ) : collections.length > 0 ? (
                <div className="space-y-2">
                    {collections.map((collection) => (
                        <button
                            key={collection.id}
                            onClick={() => onNavigate(`/collection/${collection.id}`)}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
                                    <span>{collection.emoji || '📚'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{collection.name}</p>
                                    {collection.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{collection.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {(collection.destination_count || 0).toLocaleString()} places
                                        {collection.is_public && <span className="ml-1">• Public</span>}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center dark:border-gray-800 dark:bg-gray-900/50">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">No collections yet</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Create lists to group your favorite places.</p>
                    <button
                        onClick={() => onNavigate('/account?tab=collections')}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                    >
                        Start a collection
                    </button>
                </div>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => onNavigate("/account?tab=collections")}
                    className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
                >
                    Manage Collections
                </button>
            </div>
        </div>
    );
}
