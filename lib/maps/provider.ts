export type MapProvider = 'apple' | 'mapbox' | 'google';

const MAP_PROVIDER_ORDER: MapProvider[] = ['apple', 'mapbox', 'google'];

function getAvailabilityMap(): Record<MapProvider, boolean> {
  // Check environment variables at runtime, not build time
  const appleAvailable = process.env.NEXT_PUBLIC_MAPKIT_AVAILABLE === 'true';
  const mapboxAvailable = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
  const googleAvailable = Boolean(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);

  return {
    apple: appleAvailable,
    mapbox: mapboxAvailable,
    google: googleAvailable,
  };
}

export function getAvailableProviders(order: MapProvider[] = MAP_PROVIDER_ORDER): MapProvider[] {
  const availabilityMap = getAvailabilityMap();
  return order.filter(provider => availabilityMap[provider]);
}

export function isProviderAvailable(provider: MapProvider): boolean {
  const availabilityMap = getAvailabilityMap();
  return availabilityMap[provider];
}

export function getDefaultProvider(): MapProvider | null {
  return getAvailableProviders()[0] ?? null;
}

export const mapProviderOrder = MAP_PROVIDER_ORDER;
