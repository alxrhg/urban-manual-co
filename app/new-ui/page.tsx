import Link from "next/link";
import { Metadata } from "next";
import { Map, ShieldCheck, Sparkles, Compass, LayoutGrid } from "lucide-react";
import { NewUIShowcase } from "@/components/NewUIShowcase";

export const metadata: Metadata = {
  title: "New UI | Urban Manual",
  description: "See what's new in the refreshed Urban Manual experience.",
};

const refreshNotes = [
  {
    title: "Clearer hierarchy",
    body: "Uppercase labels, consistent spacing, and balanced typography make browsing calmer and easier to scan.",
    icon: LayoutGrid,
  },
  {
    title: "Guided search",
    body: "Search intent chips, auto-resume sessions, and context cards keep you anchored in one place.",
    icon: Sparkles,
  },
  {
    title: "Map + grid harmony",
    body: "A synchronized split view lets you see neighborhoods while skimming curated picks.",
    icon: Map,
  },
];

export default function NewUIPage() {
  return (
    <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <section className="px-6 md:px-10 py-14 md:py-16 border-b border-neutral-200 dark:border-neutral-900 bg-white/80 dark:bg-black/50">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:gap-6 max-w-3xl">
            <p className="text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium">
              Launch update
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              A calmer, clearer Urban Manual.
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              We introduced a refreshed interface that puts the destinations first—simpler search, balanced spacing, and a tighter pairing between the grid and the map.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Return to the guide
              </Link>
              <Link
                href="#change-log"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 dark:border-white/20 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                View highlights
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {refreshNotes.map(note => (
              <article
                key={note.title}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/50 p-5 md:p-6 space-y-3"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white">
                  <note.icon className="h-4 w-4" aria-hidden />
                </div>
                <h2 className="text-sm uppercase tracking-[1.5px] text-gray-700 dark:text-gray-200 font-semibold">
                  {note.title}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{note.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <NewUIShowcase />

      <section
        id="change-log"
        className="px-6 md:px-10 py-12 md:py-14 border-y border-neutral-200 dark:border-neutral-900 bg-white/70 dark:bg-black/40"
      >
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div className="space-y-4 md:space-y-5">
            <p className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">Change log</p>
            <h2 className="text-2xl md:text-3xl font-semibold">What you will notice</h2>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <li>
                • Search, session resume, and context chips live together to keep momentum between queries.
              </li>
              <li>
                • The grid and map now read as one experience with matching padding and dividers.
              </li>
              <li>
                • Filters are uppercase, compact, and aligned to the editorial typography used across the guide.
              </li>
              <li>
                • Cards rely on consistent radii and thin borders—no heavy shadows—so imagery and copy stay primary.
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Accessible defaults
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <Compass className="h-4 w-4" aria-hidden />
                Calm navigation
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">Workflow preview</p>
                <h3 className="text-lg font-semibold">From idea to saved itinerary</h3>
              </div>
              <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden />
            </div>
            <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <li>1) Start with a single phrase in search or resume your last session.</li>
              <li>2) Refine with intent chips, then pivot to the map to validate neighborhoods.</li>
              <li>3) Save to trips or open the drawer for richer detail without losing context.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/#search-section"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try the new UI
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 dark:border-white/20 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Open map view
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
