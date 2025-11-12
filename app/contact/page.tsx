import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | The Urban Manual',
  description: 'Reach out to The Urban Manual team for support, partnerships, press, and general inquiries.',
};

export default function ContactPage() {
  return (
    <div className="px-6 md:px-10 lg:px-12 py-12 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold mb-6">Get in touch</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
        Whether you have a product question, a partnership idea, or just want to say hello, we&apos;d love to hear from you.
      </p>

      <section className="space-y-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">General inquiries</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Drop us a line at
            <a className="font-medium text-gray-900 dark:text-white ml-1" href="mailto:hello@theurbanmanual.com">
              hello@theurbanmanual.com
            </a>{' '}
            and the right person on the team will get back to you within a couple of days.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Press & partnerships</h2>
          <p className="text-gray-600 dark:text-gray-400">
            For media kits, interviews, or partnership opportunities, contact
            <a className="font-medium text-gray-900 dark:text-white ml-1" href="mailto:press@theurbanmanual.com">
              press@theurbanmanual.com
            </a>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Product feedback</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your suggestions help shape the roadmap. Send feature requests or bug reports to
            <a className="font-medium text-gray-900 dark:text-white ml-1" href="mailto:feedback@theurbanmanual.com">
              feedback@theurbanmanual.com
            </a>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Follow along</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Join the conversation and see where we&apos;re exploring next.
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
