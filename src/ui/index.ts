/**
 * src/ui - Shared UI primitives
 *
 * This module consolidates all shared UI components from the design system.
 * Re-exports components from @/components/ui for backwards compatibility.
 *
 * Usage:
 *   import { Button, Card, Input } from '@/src/ui'
 */

// Core UI primitives
export { Button, buttonVariants } from "@/components/ui/button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Textarea } from "@/components/ui/textarea";
export { Checkbox } from "@/components/ui/checkbox";
export { Switch } from "@/components/ui/switch";

// Selection & Dropdowns
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
export { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Navigation & Layout
export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export { Separator } from "@/components/ui/separator";
export { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
export { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// Feedback & Display
export { Badge, badgeVariants } from "@/components/ui/badge";
export { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export { Progress } from "@/components/ui/progress";
export { Skeleton } from "@/components/ui/skeleton";
export { Spinner } from "@/components/ui/spinner";
export { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Drawer & Sheet
export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerPortal, DrawerOverlay } from "@/components/ui/Drawer";
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
export { DrawerActionBar } from "@/components/ui/DrawerActionBar";
export { DrawerHeader as UMDrawerHeader } from "@/components/ui/DrawerHeader";
export { DrawerSection } from "@/components/ui/DrawerSection";

// Custom UM components
export { UMSectionTitle } from "@/components/ui/UMSectionTitle";
export { UMTagPill } from "@/components/ui/UMTagPill";
export { UMPillButton } from "@/components/ui/UMPillButton";
export { InsightChip } from "@/components/ui/InsightChip";
export { LazyImage } from "@/components/ui/lazy-image";
export { DestinationImage } from "@/components/ui/DestinationImage";

// Form utilities
export { FormField } from "@/components/ui/form-field";

// State components
export { ContentState, ContentStateTitle, ContentStateDescription, ContentStateIcon, ContentStateAction } from "@/components/ui/content-state";
export { EmptyState } from "@/components/ui/empty-state";
export { LoadingStates, LoadingGrid, LoadingList, LoadingCard, LoadingPage } from "@/components/ui/loading-states";

// Feedback utilities
export { Toaster } from "@/components/ui/sonner";
export { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
export { DismissibleAlert } from "@/components/ui/dismissible-alert";
export { UndoToast } from "@/components/ui/undo-toast";
export { PullToRefresh } from "@/components/ui/pull-to-refresh";

// Animations
export { FadeIn, SlideIn, ScaleIn, StaggeredList } from "@/components/ui/Animations";

// Split Pane
export { SplitPane } from "@/components/ui/split-pane";

// Local UI components (new consolidated components)
export { Skeleton as AppSkeleton, GridSkeleton } from "./Skeleton";
