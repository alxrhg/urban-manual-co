import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact | The Urban Manual',
  description: 'Get in touch with The Urban Manual team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white">Contact</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
            We'd love to hear from you. Whether you have questions, feedback, or suggestions, we're here to help.
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">General Inquiries</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                For general questions, feedback, or support:
              </p>
              <a 
                href="mailto:hello@theurbanmanual.com" 
                className="text-sm text-black dark:text-white underline hover:opacity-60 transition-opacity"
              >
                hello@theurbanmanual.com
              </a>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">Submit a Place</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Have a great place you'd like to see in our guide?
              </p>
              <a 
                href="mailto:submit@theurbanmanual.com" 
                className="text-sm text-black dark:text-white underline hover:opacity-60 transition-opacity"
              >
                submit@theurbanmanual.com
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                Or visit our <Link href="/submit" className="underline hover:text-black dark:hover:text-white transition-colors">submit page</Link> for more information.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">Privacy & Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                For privacy-related questions or data requests:
              </p>
              <a 
                href="mailto:privacy@theurbanmanual.com" 
                className="text-sm text-black dark:text-white underline hover:opacity-60 transition-opacity"
              >
                privacy@theurbanmanual.com
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                You can also manage your data directly from your <Link href="/account" className="underline hover:text-black dark:hover:text-white transition-colors">account settings</Link>.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">Response Time</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We aim to respond to all inquiries within 48 hours. For urgent matters, please include "URGENT" in your subject line.
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
    </div>
  );
}

