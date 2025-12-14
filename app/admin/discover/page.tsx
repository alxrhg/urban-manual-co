"use client";

import DiscoverTab from "@/features/admin/components/DiscoverTab";

export default function AdminDiscoverPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Discover configuration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manually curate the Discover feed and monitor the AI recommendations powering it.
        </p>
      </div>
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <DiscoverTab />
      </div>
    </section>
  );
}
