'use client';

import { memo, useMemo } from 'react';
import { Project, PortfolioFilters } from '@/types/portfolio';
import { ProjectCard } from './ProjectCard';

interface PortfolioGridProps {
  projects: Project[];
  filters: PortfolioFilters;
}

export const PortfolioGrid = memo(function PortfolioGrid({
  projects,
  filters,
}: PortfolioGridProps) {
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filters.category && project.category !== filters.category) {
        return false;
      }
      if (filters.location && project.location !== filters.location) {
        return false;
      }
      if (filters.industryType && project.industryType !== filters.industryType) {
        return false;
      }
      return true;
    });
  }, [projects, filters]);

  if (filteredProjects.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--editorial-border)] bg-[var(--editorial-bg)] py-16">
        <svg
          className="mb-4 h-12 w-12 text-[var(--editorial-text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-[var(--editorial-text-secondary)]">
          No projects match the selected filters
        </p>
        <p className="mt-1 text-xs text-[var(--editorial-text-tertiary)]">
          Try adjusting your filter criteria
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <p className="mb-6 text-sm text-[var(--editorial-text-secondary)]">
        Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
      </p>

      {/* Grid - 3 columns desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        {filteredProjects.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </div>
  );
});

export default PortfolioGrid;
