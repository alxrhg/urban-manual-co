// Main trip builder (new architecture)
export * from './TripBuilder';
export { TripPanel } from './TripBuilder';

// Legacy export for backward compatibility
export { default as TripBuilderPanel } from './TripBuilderPanel';

// Other trip components
export { default as TripIndicator } from './TripIndicator';
export { default as AddToTripButton } from './AddToTripButton';
