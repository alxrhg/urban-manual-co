import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsletter | The Urban Manual',
  description:
    'Subscribe to The Urban Manual newsletter to receive curated travel inspiration, itineraries, and tips in your inbox.',
};

export default function NewsletterPage() {
  return (
    <div className="px-6 md:px-10 lg:px-12 py-12 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold mb-6">Stay in the loop</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
        Join our newsletter for curated city guides, emerging hotspots, and planning tools designed to help you make the most
        of every trip. We only send the good stuff—no spam, ever.
      </p>

      <section className="space-y-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">How to subscribe</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;re putting the finishing touches on our subscription flow. In the meantime, send a quick note to
            <a className="font-medium text-gray-900 dark:text-white ml-1" href="mailto:hello@theurbanmanual.com">
              hello@theurbanmanual.com
            </a>{' '}
            with “Newsletter” in the subject line and we&apos;ll add you right away.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">What you&apos;ll receive</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li>Fresh itineraries and neighborhood walkthroughs from cities around the world</li>
            <li>Spotlight features on new restaurants, galleries, and experiences</li>
            <li>Product updates and tips for planning smarter with The Urban Manual</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Prefer social updates?</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Follow us on your platform of choice to catch highlights in real time while we build out the full newsletter
            experience.
          </p>
          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            <a
              className="rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              href="https://www.instagram.com/theurbanmanual"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a
              className="rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              href="https://www.tiktok.com/@theurbanmanual"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
