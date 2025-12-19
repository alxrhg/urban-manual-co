'use client';

import { useState } from 'react';
import { AdminGreeting } from './AdminGreeting';
import { AdminAICommandBar } from './AdminAICommandBar';
import {
  SetupCard,
  RecentAppsCard,
  ActivityCard,
  NotificationsCard,
  FavoritesCard,
  ReleasesCard,
  QuickStatsCard,
} from './DashboardCards';

export function DashboardOverview() {
  const [showSetup, setShowSetup] = useState(true);

  return (
    <div className="space-y-10">
      {/* Hero Section - Greeting & AI Command Bar */}
      <section className="text-center py-8">
        <AdminGreeting />
        <div className="mt-6">
          <AdminAICommandBar />
        </div>
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Setup Card (dismissible) */}
          {showSetup && (
            <SetupCard onDismiss={() => setShowSetup(false)} />
          )}

          {/* Notifications */}
          <NotificationsCard />

          {/* Favorites */}
          <FavoritesCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Apps */}
          <RecentAppsCard />

          {/* Activity Feed */}
          <ActivityCard />

          {/* Quick Stats */}
          <QuickStatsCard />

          {/* Releases */}
          <ReleasesCard />
        </div>
      </div>
    </div>
  );
}
