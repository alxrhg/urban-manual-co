import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact | The Urban Manual',
  description: 'Get in touch with The Urban Manual team.',
};

export default function ContactPage() {
  return (
    <article className="um-page" aria-labelledby="contact-title">
      <div className="max-w-2xl mx-auto">
        <h1 id="contact-title" className="um-heading-lg text-4xl md:text-5xl font-bold mb-6">Contact</h1>
        <p className="um-item-subtitle mb-12 leading-relaxed">
          We'd love to hear from you. Whether you have questions, feedback, or suggestions, we're here to help.
        </p>

        <div className="space-y-4">
          <section className="um-card-padded p-6">
            <h2 className="text-lg font-semibold mb-3">General Inquiries</h2>
            <p className="um-item-subtitle mb-3">
              For general questions, feedback, or support:
            </p>
            <a
              href="mailto:hello@urbanmanual.co"
              className="text-sm underline hover:opacity-60 transition-opacity"
            >
              hello@urbanmanual.co
            </a>
          </section>

          <section className="um-card-padded p-6">
            <h2 className="text-lg font-semibold mb-3">Submit a Place</h2>
            <p className="um-item-subtitle mb-3">
              Have a great place you'd like to see in our guide?
            </p>
            <a
              href="mailto:submit@urbanmanual.co"
              className="text-sm underline hover:opacity-60 transition-opacity"
            >
              submit@urbanmanual.co
            </a>
            <p className="um-text-subtle text-xs mt-3">
              Or visit our <Link href="/submit" className="underline hover:opacity-70 transition-opacity">submit page</Link> for more information.
            </p>
          </section>

          <section className="um-card-padded p-6">
            <h2 className="text-lg font-semibold mb-3">Privacy & Data</h2>
            <p className="um-item-subtitle mb-3">
              For privacy-related questions or data requests:
            </p>
            <a
              href="mailto:privacy@urbanmanual.co"
              className="text-sm underline hover:opacity-60 transition-opacity"
            >
              privacy@urbanmanual.co
            </a>
            <p className="um-text-subtle text-xs mt-3">
              You can also manage your data directly from your <Link href="/account" className="underline hover:opacity-70 transition-opacity">account settings</Link>.
            </p>
          </section>

          <section className="um-card-padded p-6">
            <h2 className="text-lg font-semibold mb-3">Response Time</h2>
            <p className="um-item-subtitle">
              We aim to respond to all inquiries within 48 hours. For urgent matters, please include "URGENT" in your subject line.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="um-back-btn"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </article>
  );
}

