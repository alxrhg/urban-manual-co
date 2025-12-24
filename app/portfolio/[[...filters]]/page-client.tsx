'use client';

import { useState, useCallback } from 'react';
import { Project, PortfolioFilters as FilterState } from '@/types/portfolio';
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';

interface PortfolioPageClientProps {
  projects: Project[];
  initialFilters: FilterState;
}

export function PortfolioPageClient({
  projects,
  initialFilters,
}: PortfolioPageClientProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  return (
    <>
      <PortfolioFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      <PortfolioGrid
        projects={projects}
        filters={filters}
      />
    </>
  );
}

export default PortfolioPageClient;
