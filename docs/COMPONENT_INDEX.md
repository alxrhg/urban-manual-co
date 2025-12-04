# Component Index

Quick reference for which components to use in Urban Manual.

---

## Buttons

### Use This

```tsx
import { Button } from '@/components/ui/button';

// Primary action
<Button>Save</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Icon button
<Button variant="ghost" size="icon"><X className="h-4 w-4" /></Button>

// Small pill
<Button variant="pill" size="sm">Tag</Button>
```

### Avoid Using

| Deprecated | Use Instead |
|------------|-------------|
| `UMPillButton` | `<Button variant="pill">` |
| `TripButton` | `<Button>` with appropriate variant |
| Inline button styles | `<Button>` component |

---

## Cards

### Base Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Destination Cards

| Component | Use Case |
|-----------|----------|
| `DestinationCard` | Grid display with hover effects |
| `HorizontalDestinationCard` | List display, compact |
| `LovablyDestinationCard` | Colorful border variant |

### Trip Cards

| Component | Use Case |
|-----------|----------|
| `PlaceCard` | Place/activity details |
| `FlightStatusCard` | Flight information |
| `LodgingCard` | Hotel/accommodation |
| `EventCard` | Event details |
| `MealCard` | Dining plans |
| `TransportCard` | Train/car transport |
| `ActivityCard` | Generic activities |
| `TimeBlockCard` | Itinerary blocks |

### Card Styling

```tsx
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
```

---

## Inputs

### Form Fields

```tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormField, validators } from '@/components/ui/form-field';

// Simple input
<div>
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>

// With validation
<FormField
  label="Email"
  rules={[validators.required(), validators.email()]}
>
  <Input type="email" />
</FormField>
```

### Selection

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
```

### Specialized Inputs

| Component | Use Case |
|-----------|----------|
| `SearchInput` | Search with clear button |
| `GooglePlacesAutocomplete` | Location search |
| `HotelAutocompleteInput` | Hotel search |
| `ArchitectTagInput` | Multi-tag input |

---

## Modals & Drawers

### Dialogs (Centered Modals)

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
```

### Drawers (Side/Bottom Sheets)

```tsx
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
```

### State Management

```tsx
// NEW (preferred)
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { openTripList, closeDrawer } from '@/lib/drawer';

// LEGACY (avoid for new code)
import { useDrawer } from '@/contexts/DrawerContext';
```

---

## Loading States

### Spinners

```tsx
import { Spinner } from '@/components/ui/spinner';

<Spinner /> // Default
<Spinner className="h-8 w-8" /> // Larger
```

### Skeletons

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import {
  DestinationCardSkeleton,
  DestinationGridSkeleton,
  ListSkeleton,
  DetailDrawerSkeleton
} from '@/components/LoadingStates';

// Generic skeleton
<Skeleton className="h-4 w-32" />

// Domain-specific
<DestinationGridSkeleton count={12} />
```

### Loading Wrapper

```tsx
import { LoadingStateWrapper } from '@/components/ui/loading-states';

<LoadingStateWrapper status={status} loadingContent={<Skeleton />}>
  {content}
</LoadingStateWrapper>
```

---

## Badges & Pills

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="success">Open</Badge>
<Badge variant="warning">Busy</Badge>
<Badge variant="destructive">Closed</Badge>
<Badge variant="outline">Neutral</Badge>
```

---

## Navigation

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

### Dropdown Menu

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
```

### Accordion

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
```

---

## Feedback

### Alerts

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { DismissibleAlert, useAlerts } from '@/components/ui/dismissible-alert';
```

### Tooltips

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
```

### Toasts

```tsx
import { toast } from 'sonner';

toast.success('Saved!');
toast.error('Something went wrong');
```

---

## Empty States

```tsx
import { EmptyState, NoSearchResults, NoTrips } from '@/components/ui/empty-state';

<EmptyState
  icon={SearchX}
  title="No results found"
  description="Try adjusting your search"
  action={{ label: "Clear filters", onClick: handleClear }}
/>

// Or pre-configured
<NoSearchResults />
<NoTrips />
```

---

## Progress

```tsx
import { Progress } from '@/components/ui/progress';
import { ProgressIndicator } from '@/components/ui/loading-states';

<Progress value={65} />
<ProgressIndicator value={65} max={100} label="Upload" showPercentage />
```

---

## Avatar

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

---

## Quick Reference

| Need | Component |
|------|-----------|
| Primary button | `<Button>` |
| Secondary button | `<Button variant="outline">` |
| Close button | `<Button variant="ghost" size="icon"><X /></Button>` |
| Text input | `<Input>` |
| Dropdown | `<Select>` |
| Toggle | `<Switch>` |
| Modal | `<Dialog>` |
| Side panel | `<Drawer>` |
| Confirmation | `<ConfirmationDialog>` |
| Loading | `<Spinner>` |
| Placeholder | `<Skeleton>` |
| Tag | `<Badge>` |
| Empty | `<EmptyState>` |

---

*Last updated: 2025-12-04*
