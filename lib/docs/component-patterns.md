# Component Documentation Patterns

This document outlines the standard patterns for documenting React components in the Urban Manual codebase.

## JSDoc Standards

All components should include JSDoc documentation with the following elements:

### Component Documentation

```tsx
/**
 * ComponentName
 *
 * Brief description of what the component does and when to use it.
 *
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value"
 *   onAction={() => handleAction()}
 * />
 * ```
 *
 * @see RelatedComponent - If there's a related component
 * @since 1.0.0 - Version when added (optional)
 */
export function ComponentName(props: ComponentNameProps) {
  // ...
}
```

### Props Interface Documentation

```tsx
interface ComponentNameProps {
  /** Primary content to display */
  children: React.ReactNode;

  /** Handler called when action completes. Returns the result ID. */
  onAction: (result: ActionResult) => void;

  /**
   * Variant of the component appearance
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline';

  /**
   * Whether the component is in a loading state
   * @default false
   */
  isLoading?: boolean;

  /** @deprecated Use `variant` instead */
  type?: string;
}
```

## Hook Documentation

```tsx
/**
 * Hook for managing component state
 *
 * Provides state management with automatic persistence and cleanup.
 *
 * @param initialValue - Starting value for the state
 * @param options - Configuration options
 * @returns Object containing state and actions
 *
 * @example
 * ```tsx
 * const { value, setValue, reset } = useCustomHook('default', {
 *   persist: true,
 * });
 * ```
 */
export function useCustomHook<T>(
  initialValue: T,
  options: HookOptions = {}
): HookResult<T> {
  // ...
}
```

## Utility Function Documentation

```tsx
/**
 * Formats a date for display
 *
 * Converts a Date object or ISO string to a localized display format.
 *
 * @param date - Date to format (Date object or ISO string)
 * @param format - Output format ('short' | 'long' | 'relative')
 * @returns Formatted date string
 * @throws {Error} If date is invalid
 *
 * @example
 * ```ts
 * formatDate(new Date(), 'short') // "Nov 29, 2025"
 * formatDate('2025-11-29', 'relative') // "Today"
 * ```
 */
export function formatDate(
  date: Date | string,
  format: DateFormat = 'short'
): string {
  // ...
}
```

## Type Documentation

```tsx
/**
 * Configuration for the feature
 *
 * @property enabled - Whether the feature is active
 * @property threshold - Minimum value to trigger (0-100)
 * @property callback - Optional handler for events
 */
interface FeatureConfig {
  enabled: boolean;
  threshold: number;
  callback?: (event: FeatureEvent) => void;
}
```

## File Header Comments

Each file should start with a header comment:

```tsx
/**
 * ComponentName
 *
 * Brief description of the file's purpose.
 * Additional context about when/why to use these exports.
 */

'use client'; // If needed

import { ... } from 'react';
```

## Inline Comments

Use inline comments sparingly for complex logic:

```tsx
// Calculate visible items with overscan buffer
const visibleItems = useMemo(() => {
  // Start index includes items above viewport for smooth scrolling
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  // ... rest of calculation
}, [scrollTop, itemHeight, overscan]);
```

## Component Folder Structure

For complex components, use this structure:

```
components/
  ComponentName/
    index.ts          # Re-exports
    ComponentName.tsx # Main component
    types.ts          # TypeScript types
    hooks.ts          # Component-specific hooks
    utils.ts          # Helper functions
    constants.ts      # Constants
```

## Accessibility Documentation

Document accessibility considerations:

```tsx
/**
 * Modal Dialog
 *
 * Accessible modal implementation with focus trap and keyboard navigation.
 *
 * Accessibility:
 * - Focus is trapped within the modal when open
 * - Escape key closes the modal
 * - Focus returns to trigger element on close
 * - Announces opening via aria-live region
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
```

## API Route Documentation

```tsx
/**
 * POST /api/destinations/search
 *
 * Search destinations with filters and pagination.
 *
 * Request Body:
 * - query: string - Search query
 * - filters: SearchFilters - Optional filters
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20)
 *
 * Response:
 * - 200: { destinations: Destination[], total: number }
 * - 400: { error: string } - Invalid parameters
 * - 500: { error: string } - Server error
 *
 * Rate Limit: 20 requests per 10 seconds
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // ...
});
```
