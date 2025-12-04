/**
 * Unified Loading Components
 *
 * This module consolidates all loading-related components for easy imports.
 *
 * Usage:
 * import { Spinner, Skeleton, DestinationCardSkeleton, LoadingOverlay } from '@/components/ui/loading';
 */

// Core loading primitives
export { Spinner } from '@/components/ui/spinner';
export { Skeleton } from '@/components/ui/skeleton';

// Advanced loading components from loading-states.tsx
export {
  Spinner as SpinnerWithSizes,
  Skeleton as SkeletonWithProps,
  CardSkeleton,
  CardGridSkeleton,
  ListItemSkeleton as BaseListItemSkeleton,
  LoadingOverlay,
  LoadingStateWrapper,
  ProgressIndicator,
} from '@/components/ui/loading-states';

// Domain-specific skeletons from LoadingStates.tsx
export {
  // Destination skeletons
  DestinationCardSkeleton,
  DestinationGridSkeleton,
  HorizontalCardSkeleton,

  // List skeletons
  ListItemSkeleton,
  ListSkeleton,

  // Profile skeletons
  ProfileHeaderSkeleton,
  UserCardSkeleton,

  // Collection skeletons
  CollectionCardSkeleton,
  CollectionGridSkeleton,

  // Trip skeletons
  TripCardSkeleton,
  TripListSkeleton,

  // Detail skeletons
  DetailDrawerSkeleton,

  // Stats skeletons
  StatsCardSkeleton,
  StatsRowSkeleton,

  // Search skeletons
  SearchSuggestionSkeleton,
  SearchHeaderSkeleton,

  // Activity skeletons
  ActivityItemSkeleton,
  ActivityFeedSkeleton,

  // Page-level loaders
  PageLoader,
  SectionLoader,

  // Chat skeletons
  ChatMessageSkeleton,
  ChatSkeleton,

  // Table skeletons
  TableRowSkeleton,
  TableSkeleton,

  // Button spinner
  ButtonSpinner,
} from '@/components/LoadingStates';
