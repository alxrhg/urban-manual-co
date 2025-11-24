'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="w-full px-6 md:px-10 py-20 min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full max-w-4xl">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-light mb-2">Activity Feed</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            See what's happening in the travel community
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`transition-all ${
                activeTab === 'all'
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
              }`}
            >
              All Activity
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`transition-all ${
                activeTab === 'following'
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
              }`}
            >
              Following
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed followingOnly={activeTab === 'following'} limit={50} />
      </div>
    </main>
  );
}
