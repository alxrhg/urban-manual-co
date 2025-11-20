"use client";

import {
    Settings,
    MapPin,
    Compass,
    LogOut,
    Bookmark,
    ChevronRight,
    Trophy,
    Folder,
    Camera,
    Share2,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

interface AccountMainProps {
    user: any;
    stats: {
        visited: number;
        saved: number;
        trips: number;
    };
    avatarUrl: string | null;
    displayUsername: string;
    onNavigate: (path: string) => void;
    onSubpageNavigate: (subpage: any) => void;
    onSignOut: () => void;
    onOpenChat: () => void;
}

export function AccountMain({
    user,
    stats,
    avatarUrl,
    displayUsername,
    onNavigate,
    onSubpageNavigate,
    onSignOut,
    onOpenChat,
}: AccountMainProps) {
    const renderNavItem = (
        label: string,
        icon: ReactNode,
        onClick: () => void,
        description?: string
    ) => (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/70"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                {description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
    );

    if (!user) {
        return (
            <div className="px-6 py-6 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome to Urban Manual</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to save places, build trips, and sync your travel profile across devices.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onNavigate("/auth/login")}
                    className="w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                >
                    Sign in to continue
                </button>
            </div>
        );
    }

    return (
        <div className="px-6 py-6 space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-lg font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Profile"
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        ) : (
                            displayUsername.charAt(0).toUpperCase()
                        )}
                    </div>
                    <button
                        onClick={() => onNavigate("/account?tab=settings")}
                        className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        aria-label="Update profile photo"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{displayUsername}</p>
                    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                        <span>@{displayUsername.toLowerCase().replace(/\s+/g, '')}</span>
                    </div>
                    {user.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        onClick={() => onNavigate("/account")}
                        className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                    >
                        Edit profile
                    </button>
                    <button
                        onClick={onOpenChat}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                    >
                        Message concierge
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[{ label: 'Visited', value: stats.visited }, { label: 'Saved', value: stats.saved }, { label: 'Trips', value: stats.trips }].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <button
                    onClick={() => onNavigate("/account?tab=settings")}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <Camera className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Add a profile photo</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Personalize your account</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                    onClick={onOpenChat}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <Share2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Invite friends</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Share Urban Manual with others</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Your manual</h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Shortcuts</span>
                </div>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    {renderNavItem('Saved places', <Bookmark className="w-4 h-4" />, () => onSubpageNavigate('saved_subpage'), `${stats.saved} items`)}
                    {renderNavItem('Visited places', <MapPin className="w-4 h-4" />, () => onSubpageNavigate('visited_subpage'), `${stats.visited} logged`)}
                    {renderNavItem('Lists', <Folder className="w-4 h-4" />, () => onSubpageNavigate('collections_subpage'), 'Organize favorites')}
                    {renderNavItem('Trips', <Compass className="w-4 h-4" />, () => onSubpageNavigate('trips_subpage'), `${stats.trips} planned`)}
                    {renderNavItem('Achievements', <Trophy className="w-4 h-4" />, () => onSubpageNavigate('achievements_subpage'), 'Milestones and badges')}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Account & settings</h3>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    {renderNavItem('Profile & preferences', <Settings className="w-4 h-4" />, () => onSubpageNavigate('settings_subpage'), 'Notifications, privacy')}
                    {renderNavItem('Sign out', <LogOut className="w-4 h-4" />, onSignOut, 'Log out safely')}
                </div>
            </div>
        </div>
    );
}
