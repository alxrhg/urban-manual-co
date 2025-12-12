/**
 * Unified Inspector System
 *
 * A collection of atomic "Studio Blocks" for displaying destination details.
 * These components are shared across the app to ensure visual consistency:
 *
 * - **Homepage**: Blocks live inside a floating <Drawer>
 * - **Trip Studio**: Same blocks live inside a pinned Right Panel
 *
 * Benefits:
 * - Perfect Sync: Update the design once, it updates everywhere
 * - Code Reusability: Map logic, hours parsing, etc. written once
 * - User Model: Users learn one way to read place details
 *
 * @example
 * // Import individual blocks for custom layouts
 * import { InspectorHero, InspectorMap, InspectorInfo } from '@/components/inspector';
 *
 * @example
 * // Import the pre-composed panel
 * import { InspectorPanel } from '@/components/inspector';
 */

// Individual blocks for maximum flexibility
export { InspectorHero, type InspectorHeroProps } from './InspectorHero';
export { InspectorMap, type InspectorMapProps } from './InspectorMap';
export { InspectorInfo, type InspectorInfoProps } from './InspectorInfo';
export { InspectorActions, type InspectorActionsProps } from './InspectorActions';
export { InspectorContact, type InspectorContactProps } from './InspectorContact';

// Pre-composed panel for quick integration
export {
  InspectorPanel,
  type InspectorPanelProps,
  type EnrichedData,
} from './InspectorPanel';
