/**
 * Haptic Feedback Utilities
 *
 * Provides native-like haptic feedback using the Vibration API.
 * Gracefully degrades on unsupported devices.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 */

'use client';

/**
 * Haptic feedback patterns
 */
export const HapticPatterns: Record<string, number[]> = {
  /** Light tap - for subtle interactions like hover */
  light: [10],
  /** Medium tap - for button presses */
  medium: [20],
  /** Heavy tap - for important actions */
  heavy: [30],
  /** Success - for completed actions */
  success: [10, 50, 10],
  /** Warning - for warnings or confirmations */
  warning: [30, 50, 30],
  /** Error - for errors or failed actions */
  error: [50, 100, 50, 100, 50],
  /** Selection changed - for picker/toggle changes */
  selection: [5],
  /** Impact light - iOS-style light impact */
  impactLight: [10],
  /** Impact medium - iOS-style medium impact */
  impactMedium: [20],
  /** Impact heavy - iOS-style heavy impact */
  impactHeavy: [30],
  /** Notification success */
  notificationSuccess: [10, 100, 10],
  /** Notification warning */
  notificationWarning: [20, 100, 20],
  /** Notification error */
  notificationError: [30, 100, 30, 100, 30],
};

export type HapticPattern = keyof typeof HapticPatterns;

/**
 * Check if haptic feedback is supported
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Check if user prefers reduced motion (should skip haptics for accessibility)
 */
function shouldSkipHaptics(): boolean {
  if (typeof window === 'undefined') return true;
  // Some users prefer no haptics when they prefer reduced motion
  // However, haptics are generally separate from visual motion
  // We'll provide a separate preference check here
  return false;
}

/**
 * Trigger haptic feedback
 *
 * @param pattern - The haptic pattern to use (or custom pattern array)
 * @returns true if haptic was triggered, false otherwise
 *
 * @example
 * ```tsx
 * // Use preset pattern
 * haptic('success');
 *
 * // Use custom pattern (vibrate 100ms, pause 50ms, vibrate 100ms)
 * haptic([100, 50, 100]);
 * ```
 */
export function haptic(pattern: HapticPattern | number[]): boolean {
  if (!isHapticsSupported() || shouldSkipHaptics()) {
    return false;
  }

  try {
    const vibrationPattern = Array.isArray(pattern)
      ? pattern
      : HapticPatterns[pattern];

    return navigator.vibrate(vibrationPattern);
  } catch (error) {
    // Vibration failed (e.g., permission denied)
    console.debug('[Haptics] Failed to vibrate:', error);
    return false;
  }
}

/**
 * Stop any ongoing haptic feedback
 */
export function stopHaptic(): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(0);
  } catch {
    return false;
  }
}

/**
 * Haptic feedback for common UI interactions
 */
export const Haptics = {
  /** Trigger on button tap */
  tap: () => haptic('medium'),

  /** Trigger on light touch (hover equivalent on mobile) */
  touch: () => haptic('light'),

  /** Trigger on toggle/switch change */
  toggle: () => haptic('selection'),

  /** Trigger on successful action */
  success: () => haptic('success'),

  /** Trigger on warning/confirmation */
  warning: () => haptic('warning'),

  /** Trigger on error */
  error: () => haptic('error'),

  /** Trigger on selection change (picker, dropdown) */
  selection: () => haptic('selection'),

  /** Trigger on long press */
  longPress: () => haptic('heavy'),

  /** Trigger on drag start */
  dragStart: () => haptic('impactLight'),

  /** Trigger on drag end/drop */
  dragEnd: () => haptic('impactMedium'),

  /** Trigger on swipe complete */
  swipe: () => haptic('impactLight'),

  /** Trigger on pull-to-refresh */
  refresh: () => haptic('impactMedium'),

  /** Custom pattern */
  custom: (pattern: number[]) => haptic(pattern),

  /** Stop haptic */
  stop: stopHaptic,
} as const;

/**
 * Create a haptic-enabled event handler
 *
 * @example
 * ```tsx
 * const handleClick = withHaptic('tap', () => {
 *   doSomething();
 * });
 *
 * <button onClick={handleClick}>Click me</button>
 * ```
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  pattern: HapticPattern | number[],
  handler: T
): T {
  return ((...args: Parameters<T>) => {
    haptic(pattern);
    return handler(...args);
  }) as T;
}

/**
 * React hook for haptic feedback
 *
 * @example
 * ```tsx
 * const { trigger, isSupported } = useHaptics();
 *
 * const handlePress = () => {
 *   trigger('success');
 *   // ... do something
 * };
 * ```
 */
export function useHaptics() {
  return {
    trigger: haptic,
    isSupported: isHapticsSupported(),
    patterns: HapticPatterns,
    ...Haptics,
  };
}

export default Haptics;
