import { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";

export const metadata: Metadata = {
  title: "Contact | The Urban Manual",
  description: "Reach the Urban Manual team for submissions, partnerships, or product support.",
};

const heroMeta = [
  { label: "Avg. response", value: "< 48 hrs" },
  { label: "Timezone", value: "GMT & PST" },
  { label: "Preferred channel", value: "Email first" },
  { label: "Status", value: "Always shipping" },
];

export default function ContactPage() {
  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <SubpageHero
          eyebrow="Contact"
          title="One inbox for curation, support, and partnerships."
          description="Write like you would inside the destination drawer: concise, thoughtful, and focused on what matters. We route every message through the same system we use to manage submissions and privacy requests so nothing gets lost."
          meta={heroMeta}
          pills={[
            { label: "Pill actions • account inspired" },
            { label: "Rounded gradients • drawer DNA" },
          ]}
          actions={
            <Link
              href="/privacy"
              className="inline-flex items-center rounded-full border border-neutral-200/80 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:text-white"
            >
              View privacy policy →
            </Link>
          }
        />

        <div className="grid gap-5 md:grid-cols-2">
          <ContentCard title="General inquiries" description="Product feedback, press, and support.">
            <a
              href="mailto:hello@urbanmanual.co"
              className="text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:opacity-80 dark:text-white"
            >
              hello@urbanmanual.co
            </a>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Expect a reply within two business days. Include screenshots if you&apos;re reporting a bug.
            </p>
          </ContentCard>

          <ContentCard title="Submit a place" description="Flag a destination that deserves a spot in the drawer.">
            <div className="space-y-2">
              <a
                href="mailto:submit@urbanmanual.co"
                className="text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:opacity-80 dark:text-white"
              >
                submit@urbanmanual.co
              </a>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Add links, a short description, and why it fits the Urban Manual perspective. You can also use the{" "}
                <Link href="/submit" className="underline">
                  submit page
                </Link>
                .
              </p>
            </div>
          </ContentCard>

          <ContentCard title="Privacy & data" description="Account deletions, exports, and compliance questions.">
            <a
              href="mailto:privacy@urbanmanual.co"
              className="text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:opacity-80 dark:text-white"
            >
              privacy@urbanmanual.co
            </a>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              You can self-serve inside{" "}
              <Link href="/account?tab=settings" className="underline">
                Account → Settings
              </Link>{" "}
              if you are signed in.
            </p>
          </ContentCard>

          <ContentCard title="Partnerships & studio" description="Collaborations, licensing, and editorial partnerships.">
            <a
              href="mailto:studio@urbanmanual.co"
              className="text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:opacity-80 dark:text-white"
            >
              studio@urbanmanual.co
            </a>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              We review pitches weekly alongside design system updates so the cadence stays aligned.
            </p>
          </ContentCard>
        </div>

        <ContentCard variant="muted" title="Response expectations">
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p>• We reply Monday–Friday from London and Los Angeles.</p>
            <p>• Urgent issues—include “URGENT” in the subject line and we&apos;ll triage within a few hours.</p>
            <p>• We log submissions in Supabase so follow-ups are threaded with your previous context.</p>
          </div>
        </ContentCard>
      </div>
    </main>
  );
}

