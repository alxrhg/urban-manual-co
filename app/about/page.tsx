import { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";

export const metadata: Metadata = {
  title: "About | The Urban Manual",
  description:
    "Learn how Urban Manual blends human editors and AI systems to curate modern travel guidance.",
};

const heroStats = [
  { label: "Destinations", value: "897+" },
  { label: "Cities covered", value: "85" },
  { label: "Countries", value: "42" },
  { label: "Revisions", value: "Weekly shipping" },
];

const heroPills = [
  { label: "Human × AI curation" },
  { label: "Pill actions everywhere" },
  { label: "Rounded corners • 24px" },
];

export default function AboutPage() {
  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <SubpageHero
          eyebrow="Inside Urban Manual"
          title="Minimal travel tooling with an editorial backbone."
          description="We design every surface to feel as considered as the destinations we feature. The homepage establishes the gradients, pill buttons, and gentle typography. The destination drawer and account area reinforce the same language for deeper workflows. Every subpage inherits that system so the experience feels continuous."
          meta={heroStats}
          pills={heroPills}
          actions={
            <>
              <Link
                href="/account?tab=collections"
                className="inline-flex items-center rounded-full border border-neutral-200/80 bg-white px-4 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
              >
                Manage collections
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full border border-neutral-200/80 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-400 dark:hover:text-white"
              >
                Talk with us →
              </Link>
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ContentCard
            eyebrow="Mission"
            title="Curate cities with care"
            description="We are a modern field guide for design-forward travelers. Every place in Urban Manual is vetted by a human editor and stress-tested by data."
          >
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>• Spotlight the places that feel intentional, independent, or quietly iconic.</li>
              <li>• Pair human taste with machine learning to keep the catalog fresh without losing perspective.</li>
              <li>• Keep the interface calm so photos, copy, and maps do the heavy lifting.</li>
            </ul>
          </ContentCard>

          <ContentCard
            eyebrow="Product system"
            title="Design language"
            description="The homepage establishes gradients, wide breathing room, and rows of pill buttons. The account area adds text tabs, grid cards, and rounded stats. We re-use those primitives everywhere else."
          >
            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <p>
                Subpages inherit the same corner radius (24–32px), translucent surfaces, and micro-typography so nothing
                feels like a secondary template.
              </p>
              <p>
                The destination drawer introduces stacked pills for tags, ratings, and actions. Those chips are now used
                on policy pages, collection cards, and city filters for consistency.
              </p>
            </div>
          </ContentCard>

          <ContentCard
            eyebrow="How we build"
            title="A blended editorial + systems approach"
          >
            <ol className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <li>
                <span className="font-medium text-neutral-900 dark:text-white">1. Research.</span> Editors live in Supabase and
                Sanity to track sourcing notes, taste markers, and cultural context for each city.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-white">2. Model.</span> ML pipelines score recency,
                sentiment, and adjacency so the drawer can surface trustworthy signals in real time.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-white">3. Ship.</span> Weekly releases tighten the UX
                system—pills, tabs, spacing—so every route inherits the same polish.
              </li>
            </ol>
          </ContentCard>

          <ContentCard
            eyebrow="Surface area"
            title="Where the design shows up"
          >
            <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Cities & collections</p>
                <p>
                  All browsing flows now open with the same hero treatment, stat grid, and lightweight actions you see on the
                  homepage.
                </p>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Policy, newsletter, submit</p>
                <p>
                  Even long-form documentation inherits the pill tabs, rounded cards, and subtle gradients so there&apos;s no
                  tonal drop-off.
                </p>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Account & drawer</p>
                <p>
                  These two experiences act as linchpins—tabs for navigation, pill buttons for actions, and editorial cards for
                  stats. Subpages reuse the same components directly.
                </p>
              </div>
            </div>
          </ContentCard>
        </div>

        <ContentCard
          variant="muted"
          title="Help us keep the guide vibrant"
          description="Submit places, send context, or collaborate on city drops."
          actions={
            <Link
              href="/submit"
              className="inline-flex items-center rounded-full border border-neutral-300/60 px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-100"
            >
              Submit a place →
            </Link>
          }
        >
          <div className="flex flex-col gap-6 text-sm text-neutral-600 dark:text-neutral-300 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Say hello</p>
              <p>hello@urbanmanual.co</p>
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Press & partnerships</p>
              <p>studio@urbanmanual.co</p>
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Product feedback</p>
              <p>
                Drop notes inside the <Link href="/account" className="underline">account area</Link>.
              </p>
            </div>
          </div>
        </ContentCard>
      </div>
    </main>
  );
}

