import { Metadata } from "next";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";

export const metadata: Metadata = {
  title: "Terms of Service | The Urban Manual",
  description: "The conditions of using Urban Manual across the app, drawer, and newsletter.",
};

const heroMeta = [
  { label: "Last updated", value: new Date().toLocaleDateString("en-US") },
  { label: "Jurisdiction", value: "UK / US" },
  { label: "Product surface", value: "Web & email" },
  { label: "Contact", value: "hello@urbanmanual.co" },
];

const sections = [
  {
    title: "Acceptance of terms",
    body: (
      <p>
        By using Urban Manual—including the homepage, subpages, destination drawer, mobile layout, and newsletter—you agree
        to these Terms and all referenced policies.
      </p>
    ),
  },
  {
    title: "Use license",
    body: (
      <>
        <p className="mb-3">
          We grant you a personal, non-transferable license to view and interact with the product. Under this license you
          may not:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Resell or commercialize the curated data, copy, or imagery.</li>
          <li>Reverse-engineer or scrape the interface, drawer, or API responses.</li>
          <li>Remove branding, edit screenshots without attribution, or misrepresent affiliation.</li>
        </ul>
      </>
    ),
  },
  {
    title: "User content",
    body: (
      <p>
        Saving places, creating collections, or submitting new destinations remains your responsibility. You grant us a
        license to host and display that content so it can appear in your account, drawer, or shared lists.
      </p>
    ),
  },
  {
    title: "Disclaimers",
    body: (
      <p>
        We mirror the calm, editorial nature of the interface but the data still ships “as is.” We do not guarantee
        availability, accuracy, or suitability of any recommendation or location.
      </p>
    ),
  },
  {
    title: "Limitations of liability",
    body: (
      <p>
        Urban Manual and its suppliers are not liable for indirect, incidental, or consequential damages resulting from the
        use of the site, drawer, or newsletters.
      </p>
    ),
  },
  {
    title: "Revisions",
    body: (
      <p>
        We may update these Terms as the product evolves. Material changes will be announced inside the account tab system
        so you can review them quickly.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions? Email <span className="font-medium text-neutral-900 dark:text-white">hello@urbanmanual.co</span> or visit
        the contact page.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <SubpageHero
          eyebrow="Terms"
          title="The legal layer that keeps our design system trustworthy."
          description="Just like the pill tabs on the account page, these terms keep everything organized: what you can do, how we treat content, and what to expect from the service."
          meta={heroMeta}
          pills={[
            { label: "Drawer-informed structure" },
            { label: "Consistent corner radius" },
          ]}
        />

        <div className="space-y-5">
          {sections.map(section => (
            <ContentCard key={section.title} title={section.title}>
              <div className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{section.body}</div>
            </ContentCard>
          ))}
        </div>
      </div>
    </main>
  );
}

