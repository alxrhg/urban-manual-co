"use client";

import ReindexTab from "@/components/admin/ReindexTab";

export default function AdminReindexPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Search reindexing</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sync destinations with external indexes and keep downstream search pipelines current.
        </p>
      </div>
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <ReindexTab />
      </div>
    </section>
  );
}
