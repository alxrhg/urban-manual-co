/**
 * Urban Manual UI Component Library
 *
 * Centralized exports for all UI components.
 * Import from '@/components/ui' for convenience.
 *
 * Usage:
 * import { Button, IconButton, Card, Drawer } from '@/components/ui';
 */

// =============================================================================
// BUTTONS
// =============================================================================

export { Button, buttonVariants } from './button';
export { IconButton, iconButtonVariants } from './IconButton';
export { PillButton, PillButtonGroup, pillButtonVariants } from './PillButton';

// =============================================================================
// ICONS
// =============================================================================

export {
  Icon,
  iconSizes,
  useIconSize,
  getIconPixelSize,
  type IconSize,
} from './Icon';

// =============================================================================
// CARDS (Original simple cards)
// =============================================================================

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';

// =============================================================================
// CARD COMPOSITION (Advanced composable cards)
// =============================================================================

export {
  Card as ComposableCard,
  CardImage,
  CardBody,
  CardHeader as ComposableCardHeader,
  CardTitle as ComposableCardTitle,
  CardMeta,
  CardDescription as ComposableCardDescription,
  CardBadge,
  CardActions,
  CardFooter as ComposableCardFooter,
  CardOverlay,
} from './card-composition';

// =============================================================================
// DRAWERS
// =============================================================================

export {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerSection,
  DrawerDivider,
} from './drawer';

// =============================================================================
// PAGE LAYOUTS
// =============================================================================

export {
  PageTransition,
  PageContainer,
  PageSection,
  PageLoading,
  PageEmpty,
  PageError,
} from './PageTransition';

// =============================================================================
// LOADING STATES
// =============================================================================

export {
  ProgressiveLoad,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonImage,
  SkeletonButton,
  SkeletonCard,
  SkeletonDestinationCard,
  SkeletonListItem,
  SkeletonGrid,
  StaggeredList,
  LoadingOverlay,
} from './ProgressiveLoad';

// =============================================================================
// FORM ELEMENTS
// =============================================================================

export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';

// =============================================================================
// FEEDBACK
// =============================================================================

export { Badge, badgeVariants } from './badge';
export { Alert, AlertTitle, AlertDescription } from './alert';
export { Spinner } from './spinner';

// =============================================================================
// OVERLAYS
// =============================================================================

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

// =============================================================================
// DATA DISPLAY
// =============================================================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// =============================================================================
// CONTROLS
// =============================================================================

export { Switch } from './switch';
export { Select } from './select';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';
