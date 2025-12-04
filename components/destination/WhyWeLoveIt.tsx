'use client';

import { Heart } from 'lucide-react';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

interface WhyWeLoveItProps {
  content?: string | null;
  microDescription?: string | null;
  editorialSummary?: string | null;
  designStory?: string | null;
  architecturalSignificance?: string | null;
}

export function WhyWeLoveIt({
  content,
  microDescription,
  editorialSummary,
  designStory,
  architecturalSignificance,
}: WhyWeLoveItProps) {
  // Prioritize editorial content
  const primaryContent = content || editorialSummary;
  const hasDesignInfo = designStory || architecturalSignificance;

  if (!primaryContent && !microDescription && !hasDesignInfo) {
    return null;
  }

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 bg-gradient-to-br from-rose-50/50 to-amber-50/50 dark:from-rose-950/20 dark:to-amber-950/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30">
          <Heart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Why We Love It
        </h2>
      </div>

      <div className="space-y-4">
        {/* Main editorial content */}
        {primaryContent && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {stripHtmlTags(primaryContent)}
          </p>
        )}

        {/* Micro description as a highlighted quote */}
        {microDescription && microDescription !== primaryContent && (
          <blockquote className="border-l-4 border-rose-300 dark:border-rose-700 pl-4 italic text-gray-600 dark:text-gray-400">
            {microDescription}
          </blockquote>
        )}

        {/* Design story */}
        {designStory && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              The Design Story
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {designStory}
            </p>
          </div>
        )}

        {/* Architectural significance */}
        {architecturalSignificance && (
          <div className={`${designStory ? '' : 'pt-4 border-t border-gray-200 dark:border-gray-700'}`}>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Architectural Significance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {architecturalSignificance}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
