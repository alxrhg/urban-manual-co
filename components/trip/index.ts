// Main trip builder (new architecture)
export * from './TripBuilder';
export { TripPanel } from './TripBuilder';

// Legacy export for backward compatibility
export { default as TripBuilderPanel } from './TripBuilderPanel';

// Planning mode components
export { default as PlanningBar } from './PlanningBar';
export { default as PlanningSheet } from './PlanningSheet';
export { default as PlanningCityPrompt } from './PlanningCityPrompt';

// Other trip components
export { default as TripIndicator } from './TripIndicator'; // Legacy - use PlanningBar
export { default as AddToTripButton } from './AddToTripButton';
