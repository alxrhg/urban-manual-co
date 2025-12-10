/**
 * Native Experience Utilities
 *
 * Export all native-like experience features from a single location.
 *
 * @example
 * ```tsx
 * import { NativeLink, useNativeExperience, Haptics } from '@/lib/native';
 * ```
 */

// Components
export { NativeLink } from '@/components/NativeLink';
export { SwipeBack } from '@/components/SwipeBack';
export {
  NativeExperienceProvider,
  useNativeExperience,
} from '@/components/NativeExperienceProvider';

// Hooks
export {
  useViewTransition,
  useViewTransitionName,
  type ViewTransitionOptions,
  type UseViewTransitionResult,
} from '@/hooks/useViewTransition';

// Utilities
export {
  Haptics,
  haptic,
  stopHaptic,
  isHapticsSupported,
  withHaptic,
  useHaptics,
  HapticPatterns,
  type HapticPattern,
} from '@/lib/haptics';
