import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description: 'Learn about The Urban Manual and our mission to help you discover amazing places.',
};

export default function AboutPage() {
  return (
    <article className="um-page" aria-labelledby="about-title">
      <div className="max-w-3xl mx-auto">
        <h1 id="about-title" className="um-heading-lg text-4xl md:text-5xl font-bold mb-12">About</h1>

        <div className="space-y-6">
          <div className="um-card-padded p-6">
            <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
            <p className="um-item-subtitle leading-relaxed">
              The Urban Manual helps you discover, save, and organize the best places to visit in cities around the world.
              We curate destinations that offer unique experiences—from hidden restaurants and local cafes to cultural sites and memorable stays.
            </p>
          </div>

          <div className="um-card-padded p-6">
            <h2 className="text-xl font-semibold mb-3">What We Do</h2>
            <p className="um-item-subtitle leading-relaxed mb-4">
              We build tools that make travel planning easier and more personal:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Curated destination guides for major cities worldwide</span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Personal collections to save and organize your favorite places</span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Trip planning tools to build detailed itineraries</span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Smart recommendations based on your preferences</span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Location-based discovery to find places near you</span>
              </li>
            </ul>
          </div>

          <div className="um-card-padded p-6">
            <h2 className="text-xl font-semibold mb-3">Our Approach</h2>
            <p className="um-item-subtitle leading-relaxed">
              We focus on quality over quantity. Every destination in our guide is carefully selected and verified.
              We believe in minimal design, clear information, and tools that get out of your way so you can focus on discovering amazing places.
            </p>
          </div>

          <div className="um-card-padded p-6">
            <h2 className="text-xl font-semibold mb-3">Get Involved</h2>
            <p className="um-item-subtitle leading-relaxed mb-4">
              We're always looking to grow our collection. You can help by:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Submitting new places through our <Link href="/submit" className="underline hover:opacity-70 transition-opacity">submit page</Link></span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Sharing feedback and suggestions</span>
              </li>
              <li className="flex items-start gap-2 um-item-subtitle">
                <span className="um-text-subtle">•</span>
                <span>Building your own collections and sharing them</span>
              </li>
            </ul>
          </div>

          <div className="um-card-padded p-6">
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="um-item-subtitle leading-relaxed">
              Have questions or want to get in touch? Visit our <Link href="/contact" className="underline hover:opacity-70 transition-opacity">contact page</Link> or email us at <a href="mailto:hello@urbanmanual.co" className="underline hover:opacity-70 transition-opacity">hello@urbanmanual.co</a>.
            </p>
          </div>
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

