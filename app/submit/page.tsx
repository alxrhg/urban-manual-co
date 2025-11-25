import { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";

export const metadata: Metadata = {
  title: "Submit a Place | The Urban Manual",
  description: "Nominate destinations that should live inside the Urban Manual drawer.",
};

const heroMeta = [
  { label: "Review cycle", value: "Weekly" },
  { label: "Lead time", value: "3–5 days" },
  { label: "Acceptance rate", value: "8%" },
  { label: "Focus", value: "Design-forward" },
];

export default function SubmitPage() {
  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <SubpageHero
          eyebrow="Submit"
          title="Point us to places with intention."
          description="We look for venues that match the calm, detail-oriented spirit of the homepage and destination drawer. Rounded corners, pill buttons, and subtle gradients are the visual language; thoughtful hospitality is the content."
          meta={heroMeta}
          pills={[
            { label: "Quality over quantity" },
            { label: "Architectural or cultural significance" },
          ]}
          actions={
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-neutral-200/80 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:text-white"
            >
              Need help? Contact us →
            </Link>
          }
        />

        <ContentCard title="How to nominate a destination">
          <ol className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li>
              <span className="font-medium text-neutral-900 dark:text-white">1. Verify the basics.</span> Confirm the place
              exists on Google Maps or Apple Maps with accurate info.
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-white">2. Gather context.</span> Share what makes it fit
              Urban Manual—design story, neighborhood energy, standout details.
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-white">3. Email the editors.</span> Send a short note with
              links, photos, and any firsthand observations.
            </li>
          </ol>
        </ContentCard>

        <ContentCard title="What we prioritize" description="We lean toward places that feel editorial and built with intention.">
          <ul className="grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
            <li>• Contemporary restaurants, bakeries, and cafes.</li>
            <li>• Boutique hotels, guesthouses, and unique stays.</li>
            <li>• Cultural spaces—museums, galleries, design studios.</li>
            <li>• Retail concepts, markets, and brand flagships.</li>
            <li>• Parks, baths, and public experiences with character.</li>
            <li>• Architecture-driven landmarks or interiors.</li>
          </ul>
        </ContentCard>

        <ContentCard variant="muted" title="Send your submission">
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p>
              <strong className="text-neutral-900 dark:text-white">Email</strong>:{" "}
              <a href="mailto:submit@urbanmanual.co" className="underline">
                submit@urbanmanual.co
              </a>
            </p>
            <p>
              <strong className="text-neutral-900 dark:text-white">Include</strong>: Name, location, website/Instagram, your
              notes, and any imagery we should review.
            </p>
            <p>
              We reply within a week. Approved places go through the same drawer-ready design pass used on the homepage.
            </p>
          </div>
        </ContentCard>
      </div>
    </main>
  );
}

