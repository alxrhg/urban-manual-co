import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Newsletter | The Urban Manual',
  description: 'Subscribe to The Urban Manual newsletter for curated destination guides and travel insights.',
};

export default function NewsletterPage() {
  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white">Newsletter</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
            Stay updated with curated destination guides, travel insights, and new features from The Urban Manual.
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3 text-black dark:text-white">What to Expect</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Weekly curated guides to new cities and destinations</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Featured collections and hidden gems</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Travel tips and planning insights</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Updates on new features and improvements</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Exclusive content for subscribers</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3 text-black dark:text-white">Coming Soon</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Our newsletter is currently in development. We're working on creating something special for our subscribers.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                In the meantime, you can stay connected by following us or checking back soon. We'll announce when the newsletter is ready!
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3 text-black dark:text-white">Get Notified</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Want to be notified when our newsletter launches? Send us an email:
              </p>
              <a 
                href="mailto:newsletter@urbanmanual.co" 
                className="text-sm text-black dark:text-white underline hover:opacity-60 transition-opacity"
              >
                newsletter@urbanmanual.co
              </a>
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
    </div>
  );
}

