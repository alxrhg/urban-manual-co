/**
 * Design Insights Panel
 * Architectural connections with clean, minimal design
 */

'use client';

import { Lightbulb, ArrowRight, Layers, GitBranch, Palette, Compass, Zap } from 'lucide-react';
import type { ArchitecturalInsight } from '@/types/architecture';

interface DesignInsightsProps {
  insights: ArchitecturalInsight[];
}

const INSIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  influence: GitBranch,
  evolution: Zap,
  contrast: Layers,
  material: Palette,
  movement: Compass,
};

export function DesignInsights({ insights }: DesignInsightsProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="py-12 text-center">
        <Lightbulb className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No architectural insights available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => {
        const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;

        return (
          <div
            key={index}
            className="group p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {insight.type}
                  </span>
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                  {insight.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {insight.description}
                </p>

                {/* Destinations Count */}
                {insight.destinations && insight.destinations.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Connects {insight.destinations.length} destinations</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
