'use client';

import { Sparkles, Map, CheckCircle, Globe } from 'lucide-react';
import { Section } from '../Section';

interface Feature {
  icon: typeof Sparkles;
  title: string;
  description: string;
  example?: string;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI-Powered Search',
    description: 'Ask natural questions to discover destinations tailored to your preferences.',
    example: '"Best hidden bars in Shibuya"',
  },
  {
    icon: Map,
    title: 'Trip Builder',
    description: 'Plan your perfect itinerary with our curated recommendations and interactive maps.',
    example: 'Organize by day and neighborhood',
  },
  {
    icon: CheckCircle,
    title: 'Track Visits',
    description: 'Mark places you\'ve been to build your travel history and unlock personalized suggestions.',
    example: 'Your travel journey, visualized',
  },
  {
    icon: Globe,
    title: 'Global Curation',
    description: '897+ handpicked destinations across 64 cities, expertly curated for discerning travelers.',
    example: 'Quality over quantity',
  },
];

/**
 * Feature card component
 */
function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <div className="
      group relative flex flex-col
      p-6 md:p-8
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
      rounded-2xl
      hover:border-gray-300 dark:hover:border-gray-700
      hover:shadow-lg
      transition-all duration-300
    ">
      {/* Icon */}
      <div className="
        w-12 h-12 mb-4
        flex items-center justify-center
        bg-gray-100 dark:bg-gray-800
        rounded-xl
        group-hover:bg-gray-200 dark:group-hover:bg-gray-700
        transition-colors duration-300
      ">
        <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
        {feature.description}
      </p>

      {/* Example */}
      {feature.example && (
        <p className="text-xs text-gray-500 dark:text-gray-500 italic">
          {feature.example}
        </p>
      )}
    </div>
  );
}

/**
 * Intelligence Features section
 * Highlights platform differentiators
 */
export function IntelligenceFeatures() {
  return (
    <Section
      title="Travel Intelligence"
      subtitle="More than a directory — your intelligent travel companion"
      className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900/50"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </Section>
  );
}
