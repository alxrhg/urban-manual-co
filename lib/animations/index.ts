/**
 * Animation System - Main Export
 *
 * A comprehensive animation system for Urban Manual
 * Built on Framer Motion with consistent timing and easing
 */

// Constants
export {
  DURATION,
  DURATION_MS,
  EASE,
  SPRING,
  STAGGER,
  TRANSITION,
  Z_INDEX,
} from './constants';

// Variants
export {
  // Fade
  fadeVariants,
  fadeScaleVariants,
  // Slide
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  // Scale
  scaleVariants,
  popVariants,
  // Modal / Drawer
  modalVariants,
  backdropVariants,
  drawerRightVariants,
  drawerLeftVariants,
  drawerBottomVariants,
  // Stagger
  staggerContainerVariants,
  staggerItemVariants,
  staggerScaleVariants,
  // Page
  pageVariants,
  pageSlideVariants,
  // Micro-interactions
  tapVariants,
  buttonVariants,
  heartVariants,
  checkmarkVariants,
  // Tooltip / Popover
  tooltipVariants,
  dropdownVariants,
  // Toast / Notification
  toastVariants,
  notificationVariants,
  // Loading
  skeletonVariants,
  shimmerVariants,
  // Celebration
  confettiVariants,
  celebrationVariants,
  // Utility functions
  createStaggerContainer,
  createSlideVariant,
} from './variants';

// Hooks
export {
  useRevealOnScroll,
  useStaggerReveal,
  useMountAnimation,
  useSafeUnmount,
  useHoverAnimation,
  usePressAnimation,
  useStaggeredList,
  useParallax,
  useScrollProgress,
  useSwipe,
  useAnimationsEnabled,
} from './hooks';
