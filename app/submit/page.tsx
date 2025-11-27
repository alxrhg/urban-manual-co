import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit a Place | The Urban Manual',
  description: 'Submit a new place to The Urban Manual',
};

export default function SubmitPage() {
  return (
    <article className="um-page">
      <div className="max-w-2xl mx-auto">
        <h1 className="um-heading-lg text-4xl font-bold mb-4">Submit a Place</h1>
        <p className="um-item-subtitle mb-8">
          Help us grow our collection by suggesting amazing places to visit.
        </p>

        <div className="um-card-padded p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">How to Submit</h2>
          <p className="um-item-subtitle mb-6">
            We're always looking to add new destinations to our guide. To submit a place:
          </p>

          <ol className="list-decimal pl-6 space-y-4 um-item-subtitle">
            <li>
              <strong>Find the place on Google Maps</strong> - Make sure the place exists and has accurate information
            </li>
            <li>
              <strong>Gather details</strong> - Collect the name, address, category, and any other relevant information
            </li>
            <li>
              <strong>Contact us</strong> - Send us an email with the place details and we'll review it for inclusion
            </li>
          </ol>
        </div>

        <div className="um-card-padded p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">What We're Looking For</h2>
          <ul className="list-disc pl-6 space-y-2 um-item-subtitle">
            <li>Restaurants, cafes, bars, and dining experiences</li>
            <li>Hotels, accommodations, and unique stays</li>
            <li>Museums, galleries, and cultural sites</li>
            <li>Parks, attractions, and activities</li>
            <li>Shops, markets, and retail experiences</li>
            <li>Any place that offers a unique travel experience</li>
          </ul>
        </div>

        <div className="um-card-padded p-8">
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <p className="um-item-subtitle mb-4">
            Ready to submit a place? Contact us with the details:
          </p>
          <div className="space-y-2 um-item-subtitle">
            <p>
              <strong>Email:</strong> submit@urbanmanual.com
            </p>
            <p>
              <strong>Include:</strong> Place name, address, category, and why you think it should be included
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

