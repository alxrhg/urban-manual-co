import { List, PanelsTopLeft, Share2 } from "lucide-react";

export function GlobalTripHeader() {
  return (
    <header className="flex items-center justify-between px-4 pt-6 pb-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gray-500">Atlas Program</p>
        <h1 className="font-sans text-3xl font-semibold uppercase tracking-tight text-gray-900 dark:text-white">
          New York Immersion
        </h1>
        <p className="font-mono text-xs tracking-[0.35em] text-gray-600 dark:text-gray-400">
          12 FEB – 15 FEB · 3 NIGHTS · 6 VENUES
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <button className="group flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800">
            <List className="h-4 w-4" />
          </button>
          <button className="group flex h-8 w-8 items-center justify-center rounded-full border border-gray-900 bg-gray-900 text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black">
            <PanelsTopLeft className="h-4 w-4" />
          </button>
        </div>
        <button className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-black">
          <span className="inline-flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" /> Export
          </span>
        </button>
      </div>
    </header>
  );
}
