// Components
export { TimeGrid } from './TimeGrid';
export { TimelineCard } from './TimelineCard';
export { CurrentTimeIndicator } from './CurrentTimeIndicator';
export { ConnectorLine } from './ConnectorLine';
export { TravelConnector } from './TravelConnector';
export type { TravelMode } from './TravelConnector';
export { DropZone } from './DropZone';
export { SuggestionChips } from './SuggestionChips';

// Hooks
export { useTimelinePositions } from './useTimelinePositions';
export type { PositionedItem } from './useTimelinePositions';
export { useDragResize } from './useDragResize';
export { useItineraryItems } from './useItineraryItems';
export type { ItineraryItemWithPosition, TimeGap } from './useItineraryItems';
export { useDragAndDrop } from './useDragAndDrop';
export type { DraggedItemState, DropTarget } from './useDragAndDrop';

// Config
export { TIMELINE_CONFIG, CATEGORY_STYLES, getCategoryStyle } from './config';
export type { CategoryStyle, CategoryType } from './config';
