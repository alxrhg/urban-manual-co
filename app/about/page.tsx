import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description: 'Learn about The Urban Manual mission, the team, and how we help travelers explore cities with confidence.',
};

export default function AboutPage() {
  return (
    <div className="px-6 md:px-10 lg:px-12 py-12 max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold mb-6">Our mission</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
        The Urban Manual helps travelers cut through decision fatigue. We surface trusted places, build itineraries in minutes,
        and keep everything organized—from inspiration to check-in.
      </p>

      <section className="space-y-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Built for curious travelers</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We believe the best trips are a blend of iconic landmarks and hidden gems. Our platform combines expert research,
            community insights, and real-time data so you can explore cities like a local—without spending hours researching.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Curated intelligence</h3>
            <p className="text-gray-600 dark:text-gray-400">
              We partner with on-the-ground experts, trusted publications, and data providers to evaluate every destination.
              Only the standouts make it into The Urban Manual.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Planning superpowers</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Save spots, build shareable itineraries, and access smart recommendations that adapt to the way you travel—solo,
              with friends, or on a quick work trip.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">What&apos;s next</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;re continually expanding into new cities and rolling out features that make discovering and planning easier.
            Want to collaborate, share feedback, or bring The Urban Manual to your city?
            <a className="font-medium text-gray-900 dark:text-white ml-1" href="mailto:hello@theurbanmanual.com">
              Say hello.
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
