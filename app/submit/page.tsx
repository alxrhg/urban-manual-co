import { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = {
  title: 'Submit a Place | The Urban Manual',
  description: 'Submit a new place to The Urban Manual',
};

export default function SubmitPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Contribute"
        title="Submit a Place"
        description="Help us curate the next extraordinary destination by sharing the places you love."
      />

      <PageContainer width="standard" className="space-y-8">
        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How to Submit</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            We're always looking to add new destinations to our guide. To submit a place:
          </p>

          <ol className="list-decimal pl-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong className="font-semibold">Find the place on Google Maps</strong> — Make sure the place exists and has accurate information.
            </li>
            <li>
              <strong className="font-semibold">Gather details</strong> — Collect the name, address, category, and any other relevant information.
            </li>
            <li>
              <strong className="font-semibold">Contact us</strong> — Send us an email with the place details and we'll review it for inclusion.
            </li>
          </ol>
        </section>

        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">What We're Looking For</h2>
          <ul className="list-disc pl-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>Restaurants, cafes, bars, and dining experiences</li>
            <li>Hotels, accommodations, and unique stays</li>
            <li>Museums, galleries, and cultural sites</li>
            <li>Parks, attractions, and activities</li>
            <li>Shops, markets, and retail experiences</li>
            <li>Any place that offers a unique travel experience</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Get in Touch</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Ready to submit a place? Contact us with the details:
          </p>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>Email:</strong> submit@urbanmanual.com
            </p>
            <p>
              <strong>Include:</strong> Place name, address, category, and why you think it should be included.
            </p>
          </div>
        </section>

        <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </PageContainer>
    </PageShell>
  );
}

