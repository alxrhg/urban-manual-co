"use client";

import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Inline dashboard powered by Supabase metrics and user events.
        </p>
      </div>
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <AnalyticsDashboard variant="embedded" />
      </div>
    </section>
  );
}
