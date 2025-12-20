import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Utensils, Building2, Star, Users, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description: 'The Urban Manual is a curated travel guide featuring 897+ handpicked destinations across 50+ cities worldwide. Learn about our mission, methodology, and the team behind the curation.',
};

const stats = [
  { value: '897+', label: 'Curated Destinations', icon: MapPin },
  { value: '50+', label: 'Cities Worldwide', icon: Globe },
  { value: '100+', label: 'Michelin Stars', icon: Star },
  { value: '2024', label: 'Founded', icon: Building2 },
];

export default function AboutPage() {
  return (
    <article className="min-h-screen" aria-labelledby="about-title">
      {/* Hero Section */}
      <section className="px-6 md:px-10 pt-20 pb-16">
        <div className="max-w-3xl mx-auto">
          <h1 id="about-title" className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white">
            About The Urban Manual
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            A curated collection of the world&apos;s most remarkable places—handpicked for discerning travelers who value quality over quantity.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 md:px-10 py-12 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                <div className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="px-6 md:px-10 py-16">
        <div className="max-w-3xl mx-auto space-y-16">

          {/* Our Story */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Our Story</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                The Urban Manual was born from a simple frustration: finding truly exceptional places to eat, drink, and stay has become needlessly complicated. Algorithms optimize for popularity. Review platforms reward volume over quality. The result is a sea of sameness.
              </p>
              <p>
                We started with a different premise—that a smaller, carefully vetted collection would serve travelers better than an exhaustive database. Every destination in The Urban Manual has been researched, verified, and selected based on what actually matters: the quality of the experience.
              </p>
              <p>
                Today, our collection spans over 50 cities and 897 destinations, from Michelin-starred restaurants to neighborhood cafes, from landmark hotels to hidden bars. Each one chosen with intention.
              </p>
            </div>
          </section>

          {/* Our Approach */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Our Approach</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                We believe in <strong className="text-black dark:text-white">quality over quantity</strong>. Rather than listing every restaurant in a city, we focus on the ones worth your time. Every destination is evaluated on craftsmanship, atmosphere, and the overall experience it delivers.
              </p>
              <p>
                We believe in <strong className="text-black dark:text-white">minimal design</strong>. Travel planning should be effortless. Our interface stays out of your way so you can focus on discovery, not navigation.
              </p>
              <p>
                We believe in <strong className="text-black dark:text-white">transparency</strong>. When we use AI to make recommendations, we explain why. Our smart features are designed to enhance your judgment, not replace it.
              </p>
            </div>
          </section>

          {/* Curation Methodology */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">How We Curate</h2>
            <div className="space-y-6">
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 uppercase tracking-wider">Research</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Every destination begins with extensive research—local guides, culinary publications, design journals, and trusted recommendations from travelers and industry professionals.
                </p>
              </div>
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 uppercase tracking-wider">Verification</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We verify key details—hours, locations, menus, and current status. Our data is enriched through official sources and kept up to date.
                </p>
              </div>
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 uppercase tracking-wider">Selection</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Not everything makes the cut. We evaluate quality of experience, consistency, atmosphere, and whether it offers something distinctive worth seeking out.
                </p>
              </div>
              <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 uppercase tracking-wider">Ongoing Review</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our collection evolves. Destinations are regularly reviewed, and we remove places that no longer meet our standards or have closed.
                </p>
              </div>
            </div>
          </section>

          {/* What We Cover */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">What We Cover</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <Utensils className="h-5 w-5 text-gray-400 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Dining</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Restaurants, cafes, and bars—from Michelin-starred fine dining to exceptional neighborhood spots.
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Stays</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hotels and accommodations selected for design, service, and character.
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Experiences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cultural sites, shops, and distinctive places that define a city&apos;s character.
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <Star className="h-5 w-5 text-gray-400 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Recognition</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We highlight Michelin stars, James Beard nominations, and other notable distinctions.
                </p>
              </div>
            </div>
          </section>

          {/* Team */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">The Team</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                The Urban Manual is built by a small team with backgrounds in design, technology, and hospitality. We&apos;re travelers ourselves—the kind who research restaurants weeks before a trip and keep running lists of places to try.
              </p>
              <p>
                We combine editorial judgment with modern technology. Our AI-powered features help surface relevant recommendations, but the foundation is always human curation.
              </p>
            </div>
          </section>

          {/* Get Involved */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white">Get Involved</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              We&apos;re always looking to grow our collection. You can help by:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <span className="text-gray-300 dark:text-gray-700">—</span>
                <span>Submitting new places through our <Link href="/submit" className="underline hover:text-black dark:hover:text-white transition-colors">submit page</Link></span>
              </li>
              <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <span className="text-gray-300 dark:text-gray-700">—</span>
                <span>Sharing feedback and suggestions via <Link href="/contact" className="underline hover:text-black dark:hover:text-white transition-colors">contact</Link></span>
              </li>
              <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <span className="text-gray-300 dark:text-gray-700">—</span>
                <span>Building and sharing your own collections</span>
              </li>
            </ul>
          </section>

          {/* Contact & Press */}
          <section className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3 uppercase tracking-wider">Contact</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  General inquiries and feedback
                </p>
                <a href="mailto:hello@urbanmanual.co" className="text-sm underline text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  hello@urbanmanual.co
                </a>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3 uppercase tracking-wider">Press</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Media inquiries and press kit
                </p>
                <Link href="/press" className="text-sm underline text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  View Press Page →
                </Link>
              </div>
            </div>
          </section>

          {/* Back Link */}
          <div className="pt-8">
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
