import { Metadata } from 'next';
import Link from 'next/link';
import { Download, Mail, ExternalLink, MapPin, Globe, Star, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Press | The Urban Manual',
  description: 'Press resources, media kit, and contact information for The Urban Manual. Download brand assets and get key facts for your coverage.',
};

const keyFacts = [
  { label: 'Curated Destinations', value: '897+', icon: MapPin },
  { label: 'Cities Covered', value: '50+', icon: Globe },
  { label: 'Michelin Stars Featured', value: '100+', icon: Star },
  { label: 'Founded', value: '2024', icon: Calendar },
];

const brandColors = [
  { name: 'Primary Black', hex: '#000000', textColor: 'text-white' },
  { name: 'Primary White', hex: '#FFFFFF', textColor: 'text-black', border: true },
  { name: 'Gray 600', hex: '#4B5563', textColor: 'text-white' },
  { name: 'Gray 200', hex: '#E5E7EB', textColor: 'text-black' },
];

export default function PressPage() {
  return (
    <article className="min-h-screen" aria-labelledby="press-title">
      {/* Hero Section */}
      <section className="px-6 md:px-10 pt-20 pb-16">
        <div className="max-w-3xl mx-auto">
          <h1 id="press-title" className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white">
            Press
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            Resources and information for media coverage of The Urban Manual.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:press@urbanmanual.co"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
            >
              <Mail className="h-4 w-4" />
              Contact Press Team
            </a>
            <a
              href="#brand-assets"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-800 text-sm font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Brand Assets
            </a>
          </div>
        </div>
      </section>

      {/* Key Facts */}
      <section className="px-6 md:px-10 py-12 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-8 text-center">
            Key Facts
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {keyFacts.map((fact, index) => (
              <div key={index} className="text-center">
                <fact.icon className="h-5 w-5 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                <div className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-1">
                  {fact.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                  {fact.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="px-6 md:px-10 py-16">
        <div className="max-w-3xl mx-auto space-y-16">

          {/* About The Urban Manual */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">About The Urban Manual</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                <strong className="text-black dark:text-white">The Urban Manual</strong> is a curated travel guide featuring over 897 handpicked destinations across 50+ cities worldwide. Unlike algorithm-driven platforms, every destination is researched, verified, and selected by our editorial team based on quality of experience.
              </p>
              <p>
                The platform combines editorial curation with AI-powered personalization, helping travelers discover restaurants, hotels, cafes, and cultural destinations that match their preferences. Our collection includes over 100 Michelin-starred restaurants alongside exceptional neighborhood spots.
              </p>
              <p>
                Founded in 2024, The Urban Manual is built for discerning travelers who value quality over quantity and seek destinations worth their time.
              </p>
            </div>
          </section>

          {/* Boilerplate */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Boilerplate</h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                &ldquo;The Urban Manual is a curated travel guide featuring 897+ handpicked destinations across 50+ cities worldwide. Combining editorial expertise with AI-powered personalization, the platform helps discerning travelers discover exceptional restaurants, hotels, and cultural destinations. Founded in 2024, The Urban Manual focuses on quality over quantity—every destination is researched, verified, and selected based on the quality of experience it delivers.&rdquo;
              </p>
            </div>
          </section>

          {/* Brand Assets */}
          <section id="brand-assets">
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Brand Assets</h2>
            <div className="space-y-8">
              {/* Logo */}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 uppercase tracking-wider">Logo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex items-center justify-center bg-white">
                    <div className="text-xl font-bold text-black tracking-tight">
                      Urban Manual<sup className="text-xs">®</sup>
                    </div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex items-center justify-center bg-black">
                    <div className="text-xl font-bold text-white tracking-tight">
                      Urban Manual<sup className="text-xs">®</sup>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                  The logo should always appear in black on light backgrounds or white on dark backgrounds. Maintain clear space around the logo equal to the height of the &ldquo;U&rdquo; in Urban.
                </p>
              </div>

              {/* Colors */}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 uppercase tracking-wider">Brand Colors</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {brandColors.map((color, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className={`aspect-square rounded-2xl flex items-end p-3 ${color.border ? 'border border-gray-200 dark:border-gray-800' : ''}`}
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className={`text-xs font-mono ${color.textColor}`}>{color.hex}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{color.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 uppercase tracking-wider">Typography</h3>
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The Urban Manual uses system fonts for optimal performance and readability across all devices. Headlines use bold weight (700), body text uses regular weight (400).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Coverage Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Coverage Guidelines</h2>
            <div className="space-y-4">
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Name Usage</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please refer to us as &ldquo;The Urban Manual&rdquo; on first reference, and &ldquo;Urban Manual&rdquo; on subsequent references. Avoid abbreviations like &ldquo;TUM.&rdquo;
                </p>
              </div>
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Website</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our website URL is <a href="https://www.urbanmanual.co" className="underline hover:text-black dark:hover:text-white transition-colors">www.urbanmanual.co</a>
                </p>
              </div>
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The Urban Manual is a &ldquo;curated travel guide&rdquo; or &ldquo;travel curation platform.&rdquo; We are not a review site, booking platform, or social network.
                </p>
              </div>
            </div>
          </section>

          {/* Press Contact */}
          <section className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Press Contact</h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                For press inquiries, interview requests, or additional assets, please contact:
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:press@urbanmanual.co"
                  className="flex items-center gap-2 text-black dark:text-white hover:opacity-70 transition-opacity"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">press@urbanmanual.co</span>
                </a>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                We aim to respond to all media inquiries within 24 hours.
              </p>
            </div>
          </section>

          {/* Back Links */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <Link
              href="/about"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              ← About Us
            </Link>
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
