import { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";

export const metadata: Metadata = {
  title: "Newsletter | The Urban Manual",
  description: "Join the Urban Manual drop list for new city issues, collections, and design updates.",
};

const heroMeta = [
  { label: "Cadence", value: "Bi-weekly" },
  { label: "Format", value: "Editorial email" },
  { label: "Status", value: "In beta" },
  { label: "Subscribers", value: "Invite-only" },
];

export default function NewsletterPage() {
  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <SubpageHero
          eyebrow="Newsletter"
          title="A soft-launch digest for new drops."
          description="Same design language as the homepage—pill sections, editorial typography, and travel intelligence—delivered in inbox form. We send new city spotlights, collection breakdowns, and product notes when they are ready rather than on an arbitrary schedule."
          meta={heroMeta}
          pills={[
            { label: "Pill dividers + rounded cards" },
            { label: "Reader view tuned for Mac + iPhone" },
          ]}
          actions={
            <Link
              href="/account?tab=preferences"
              className="inline-flex items-center rounded-full border border-neutral-200/80 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:text-white"
            >
              Update email preferences →
            </Link>
          }
        />

        <ContentCard title="What to expect" description="Each issue mirrors the destination drawer—dense context, calm layout.">
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <li>• Curated city cheat sheets with the same stats and pills you see on the site.</li>
            <li>• Account-inspired tabs that highlight saved lists, new launches, and trending drawers.</li>
            <li>• Dispatches from the ML team covering sentiment swings, anomalies, and forecasting charts.</li>
            <li>• Roadmap notes so you can follow along with new components as they land.</li>
          </ul>
        </ContentCard>

        <ContentCard title="Current status" description="We are staging the first public batch with design parity across devices.">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Internal issues are already running with the same typography scale and pill dividers from the account page.
            Once the last layout checks on iPhone are done we will invite the waitlist.
          </p>
        </ContentCard>

        <ContentCard variant="muted" title="Get notified" description="Opt into the list now and we’ll send the launch issue first.">
          <a
            href="mailto:newsletter@urbanmanual.co"
            className="inline-flex items-center rounded-full border border-neutral-200/80 bg-white px-5 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
          >
            newsletter@urbanmanual.co
          </a>
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Add a city you care about in the subject line so we can personalize your first send.
          </p>
        </ContentCard>

        <ContentCard title="Meanwhile" description="Use the account area as your living newsletter.">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            All the stats, chips, and gradients you see in our emails live inside your{" "}
            <Link href="/account" className="underline">
              account dashboard
            </Link>
            . Think of the newsletter as an occasional recap of what your drawer is already surfacing.
          </p>
        </ContentCard>
      </div>
    </main>
  );
}

