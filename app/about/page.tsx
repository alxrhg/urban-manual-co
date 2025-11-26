import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description: 'Learn about The Urban Manual and our mission to help you discover amazing places.',
};

export default function AboutPage() {
  return (
    <article className="min-h-screen" aria-labelledby="about-title">
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 id="about-title" className="text-4xl md:text-5xl font-bold mb-12 text-black dark:text-white">About</h1>

          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Our Mission</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                The Urban Manual helps you discover, save, and organize the best places to visit in cities around the world.
                We curate destinations that offer unique experiences—from hidden restaurants and local cafes to cultural sites and memorable stays.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">What We Do</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We build tools that make travel planning easier and more personal:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Curated destination guides for major cities worldwide</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Personal collections to save and organize your favorite places</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Trip planning tools to build detailed itineraries</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Smart recommendations based on your preferences</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Location-based discovery to find places near you</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 bg-white/40 dark:bg-white/5 backdrop-blur">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Plan, Explore, Remember</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                These are the tools we&apos;re building to make trip planning feel effortless. Create guides, talk with a local-style
                concierge, plan with saved searches, and revisit everywhere you&apos;ve been with a personal map.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-white/5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-200 font-semibold">
                      01
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">Travel Guide</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Start with curated sections for everything you need on a trip.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-white/5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-200 font-semibold">
                      02
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">Explore like a local</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Get quick, 1:1 messaging with The Urban Manual&apos;s concierge.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-white/5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-200 font-semibold">
                      03
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">Plan in detail</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Build from saved searches to quickly tailor recommendations.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/10 dark:to-white/5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-700 dark:text-sky-200 font-semibold">
                      04
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">Organize plans</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Create collections to sort destinations into trip-ready lists.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-white/5 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-700 dark:text-rose-200 font-semibold">
                      05
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">See everywhere you&apos;ve visited</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Review past trips with a simple map of your explored destinations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Our Approach</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We focus on quality over quantity. Every destination in our guide is carefully selected and verified.
                We believe in minimal design, clear information, and tools that get out of your way so you can focus on discovering amazing places.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Get Involved</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We're always looking to grow our collection. You can help by:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Submitting new places through our <Link href="/submit" className="underline hover:text-black dark:hover:text-white transition-colors">submit page</Link></span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Sharing feedback and suggestions</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Building your own collections and sharing them</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Contact</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Have questions or want to get in touch? Visit our <Link href="/contact" className="underline hover:text-black dark:hover:text-white transition-colors">contact page</Link> or email us at <a href="mailto:hello@urbanmanual.co" className="underline hover:text-black dark:hover:text-white transition-colors">hello@urbanmanual.co</a>.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link 
              href="/"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

