/**
 * Pagination SEO Utilities
 *
 * Generates pagination metadata for SEO optimization.
 * Implements rel="prev" and rel="next" link tags.
 */

interface PaginationMeta {
  prev?: string;
  next?: string;
  canonical: string;
}

interface PaginationParams {
  currentPage: number;
  totalPages: number;
  basePath: string;
  pageParam?: string;
}

/**
 * Generate pagination link relationships for SEO
 */
export function generatePaginationMeta({
  currentPage,
  totalPages,
  basePath,
  pageParam = 'page',
}: PaginationParams): PaginationMeta {
  const baseUrl = 'https://www.urbanmanual.co';
  const result: PaginationMeta = {
    canonical: currentPage === 1
      ? `${baseUrl}${basePath}`
      : `${baseUrl}${basePath}?${pageParam}=${currentPage}`,
  };

  if (currentPage > 1) {
    result.prev = currentPage === 2
      ? `${baseUrl}${basePath}`
      : `${baseUrl}${basePath}?${pageParam}=${currentPage - 1}`;
  }

  if (currentPage < totalPages) {
    result.next = `${baseUrl}${basePath}?${pageParam}=${currentPage + 1}`;
  }

  return result;
}

/**
 * Generate pagination metadata for Next.js Metadata API
 */
export function generatePaginationMetadata({
  currentPage,
  totalPages,
  basePath,
  pageParam = 'page',
}: PaginationParams) {
  const pagination = generatePaginationMeta({ currentPage, totalPages, basePath, pageParam });

  return {
    alternates: {
      canonical: pagination.canonical,
    },
    other: {
      ...(pagination.prev && { 'link:prev': pagination.prev }),
      ...(pagination.next && { 'link:next': pagination.next }),
    },
  };
}

/**
 * Calculate pagination info from total items and page size
 */
export function calculatePagination(
  totalItems: number,
  pageSize: number,
  currentPage: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    totalPages,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    itemsOnPage: endIndex - startIndex,
  };
}

/**
 * Generate page numbers for pagination UI
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  // Calculate start and end of visible range
  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if at the beginning or end
  if (currentPage <= halfVisible + 1) {
    end = Math.min(totalPages - 1, maxVisible - 1);
  }
  if (currentPage >= totalPages - halfVisible) {
    start = Math.max(2, totalPages - maxVisible + 2);
  }

  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push('ellipsis');
  }

  // Add visible pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
