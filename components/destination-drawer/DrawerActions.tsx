'use client';

import { Heart, Check, Share2, Plus, Loader2 } from 'lucide-react';

interface DrawerActionsProps {
    isSaved: boolean;
    isVisited: boolean;
    loading: boolean;
    copied: boolean;
    heartAnimating: boolean;
    checkAnimating: boolean;
    onSave: () => void;
    onVisit: () => void;
    onShare: () => void;
    onAddToList?: () => void;
    isAuthenticated: boolean;
}

export function DrawerActions({
    isSaved,
    isVisited,
    loading,
    copied,
    heartAnimating,
    checkAnimating,
    onSave,
    onVisit,
    onShare,
    onAddToList,
    isAuthenticated,
}: DrawerActionsProps) {
    return (
        <div className="flex gap-2 mb-6">
            {/* Save Button */}
            <button
                onClick={onSave}
                disabled={loading || !isAuthenticated}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${isSaved
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    } ${heartAnimating ? 'scale-95' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isAuthenticated ? (isSaved ? 'Saved' : 'Save') : 'Sign in to save'}
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Heart
                        className={`h-5 w-5 transition-all ${isSaved ? 'fill-current' : ''
                            } ${heartAnimating ? 'scale-125' : ''}`}
                    />
                )}
                <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Visit Button */}
            <button
                onClick={onVisit}
                disabled={loading || !isAuthenticated}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${isVisited
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    } ${checkAnimating ? 'scale-95' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isAuthenticated ? (isVisited ? 'Visited' : 'Mark as visited') : 'Sign in to mark as visited'}
            >
                <Check
                    className={`h-5 w-5 transition-all ${checkAnimating ? 'scale-125' : ''}`}
                />
                <span className="text-sm">{isVisited ? 'Visited' : 'Visit'}</span>
            </button>

            {/* Share Button */}
            <button
                onClick={onShare}
                className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Share"
            >
                <Share2 className="h-5 w-5" />
            </button>

            {/* Add to List Button */}
            {isAuthenticated && onAddToList && (
                <button
                    onClick={onAddToList}
                    className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Add to list"
                >
                    <Plus className="h-5 w-5" />
                </button>
            )}

            {/* Copied Feedback */}
            {copied && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full">
                    Link copied!
                </div>
            )}
        </div>
    );
}
