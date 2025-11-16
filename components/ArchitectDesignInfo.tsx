'use client';

import { Building2, Palette, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Destination } from '@/types/destination';
import { architectNameToSlug } from '@/lib/architect-utils';
import { DesktopHoverCard } from './DesktopHoverCard';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { truncate } from '@/lib/utils';

interface ArchitectDesignInfoProps {
  destination: Destination;
}

export function ArchitectDesignInfo({ destination }: ArchitectDesignInfoProps) {
  // Extract architect/design information
  const architect = destination.architect;
  const designFirm = destination.design_firm;
  const interiorDesigner = destination.interior_designer || (destination as any).designer_name;
  const architecturalStyle = destination.architectural_style;
  const designPeriod = destination.design_period;
  const architectInfoJson = destination.architect_info_json as any;

  // Check if we have any architect/design info to display
  const hasInfo = architect || designFirm || interiorDesigner || architecturalStyle || designPeriod;

  if (!hasInfo) {
    return null;
  }

  // Extract sources from architect_info_json if available
  const sources = architectInfoJson?.sources || [];
  const architectSummaryRaw =
    typeof architectInfoJson?.summary === 'string'
      ? architectInfoJson.summary
      : typeof architectInfoJson?.description === 'string'
        ? architectInfoJson.description
        : Array.isArray(architectInfoJson?.highlights)
          ? architectInfoJson.highlights.join(' • ')
          : null;
  const architectSummary = architectSummaryRaw
    ? truncate(stripHtmlTags(architectSummaryRaw), 220)
    : null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
      <h2 className="text-sm font-medium mb-4">Architecture & Design</h2>
      <div className="space-y-4">
        {/* Architect */}
        {architect && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Architect</div>
                <DesktopHoverCard
                  align="left"
                  title="Architect insight"
                  content={
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{architect}</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {architectSummary || `Explore additional works from ${architect} and compare their signature style.`}
                      </p>
                      {sources.length > 0 && (
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {sources.length} source{sources.length === 1 ? '' : 's'} cited
                        </p>
                      )}
                    </div>
                  }
                  widthClass="w-80"
                >
                  <Link
                    href={`/architect/${architectNameToSlug(architect)}`}
                    className="text-sm text-gray-900 dark:text-white font-medium hover:underline inline-block"
                  >
                    {architect}
                  </Link>
                </DesktopHoverCard>
            </div>
          </div>
        )}

        {/* Design Firm */}
        {designFirm && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Design Firm</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {designFirm}
              </div>
            </div>
          </div>
        )}

        {/* Interior Designer */}
        {interiorDesigner && (
          <div className="flex items-start gap-3">
            <Palette className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Interior Designer</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {interiorDesigner}
              </div>
            </div>
          </div>
        )}

        {/* Architectural Style */}
        {architecturalStyle && (
          <div className="flex items-start gap-3">
            <Palette className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Style</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium capitalize">
                {architecturalStyle}
              </div>
            </div>
          </div>
        )}

        {/* Design Period */}
        {designPeriod && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Period</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {designPeriod}
              </div>
            </div>
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sources</div>
            <div className="space-y-1.5">
              {sources.slice(0, 3).map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  <span className="truncate">{source.title || source.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

