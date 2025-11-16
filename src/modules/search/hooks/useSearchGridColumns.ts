import { useItemsPerPage } from '@/hooks/useGridColumns';

/**
 * Search grid helper that always returns a count aligned to
 * the number of visual rows we want to display.
 */
export function useSearchGridColumns(rows: number = 4) {
  return useItemsPerPage(rows);
}
