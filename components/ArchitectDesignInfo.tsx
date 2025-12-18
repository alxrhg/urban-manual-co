'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Destination } from '@/types/destination';
import { Architect, DesignFirm, DesignMovement } from '@/types/architecture';
import { architectNameToSlug } from '@/lib/architect-utils';

interface ArchitectDesignInfoProps {
  destination: Destination;
}

export function ArchitectDesignInfo({ destination }: ArchitectDesignInfoProps) {
  // Extract architect/design information - check for new architecture-first data first
  const architectObj = (destination as any).architect_obj as Architect | undefined;
  const designFirmObj = (destination as any).design_firm_obj as DesignFirm | undefined;
  const interiorDesignerObj = (destination as any).interior_designer_obj as Architect | undefined;
  const movementObj = (destination as any).movement_obj as DesignMovement | undefined;
  
  // Fallback to legacy text fields
  const architect = architectObj?.name || destination.architect;
  const designFirm = designFirmObj?.name || destination.design_firm;
  const interiorDesigner = interiorDesignerObj?.name || destination.interior_designer || (destination as any).designer_name;
  const architecturalStyle = destination.architectural_style;
  const designPeriod = destination.design_period;
  const architectInfoJson = destination.architect_info_json as any;
  
  // Architecture-first content fields
  const architecturalSignificance = (destination as any).architectural_significance;
  const designStory = (destination as any).design_story;
  const constructionYear = (destination as any).construction_year;

  // Check if we have any architect/design info to display
  const hasInfo = architect || designFirm || interiorDesigner || architecturalStyle || designPeriod || 
                  architecturalSignificance || designStory || movementObj;

  if (!hasInfo) {
    return null;
  }

  // Extract sources from architect_info_json if available
  const sources = architectInfoJson?.sources || [];
  
  // Format architect years
  const formatArchitectYears = (arch: Architect) => {
    if (arch.birth_year && arch.death_year) {
      return `${arch.birth_year}–${arch.death_year}`;
    } else if (arch.birth_year) {
      return `b. ${arch.birth_year}`;
    }
    return null;
  };

  return (
    <div className="mb-8">
      <h2 className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-4">Design & Architecture</h2>
      <div className="space-y-4">
        {/* Architect - Avatar style */}
        {architect && (
          <Link
            href={architectObj?.slug ? `/architect/${architectObj.slug}` : `/architect/${architectNameToSlug(architect)}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">a</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Architect</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium group-hover:underline flex items-center gap-1">
                {architect}
                <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        )}

        {/* Design Firm - Avatar style */}
        {designFirm && !architect && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">d</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Design Firm</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium">
                {designFirm}
              </div>
            </div>
          </div>
        )}

        {/* Interior Designer - Avatar style */}
        {interiorDesigner && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">i</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Interior Designer</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium">
                {interiorDesigner}
              </div>
            </div>
          </div>
        )}

        {/* Architectural Style - Avatar style */}
        {architecturalStyle && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">s</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Style</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium capitalize">
                {architecturalStyle}
              </div>
            </div>
          </div>
        )}

        {/* Design Movement - Avatar style with link */}
        {movementObj && (
          <Link
            href={`/movement/${movementObj.slug}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">m</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Movement</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium group-hover:underline flex items-center gap-1">
                {movementObj.name}
                <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        )}

        {/* Design Period (legacy) - Avatar style */}
        {designPeriod && !movementObj && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">p</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Period</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium">
                {designPeriod}
              </div>
            </div>
          </div>
        )}

        {/* Construction Year - Avatar style */}
        {constructionYear && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">y</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-400 dark:text-gray-500">Year Built</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-medium">
                {constructionYear}
              </div>
            </div>
          </div>
        )}

        {/* Architectural Significance - Expandable section */}
        {architecturalSignificance && (
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">Significance</div>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {architecturalSignificance}
            </p>
          </div>
        )}

        {/* Design Story */}
        {designStory && (
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">Design Story</div>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {designStory}
            </p>
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">Sources</div>
            <div className="space-y-2">
              {sources.slice(0, 3).map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                  <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
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

