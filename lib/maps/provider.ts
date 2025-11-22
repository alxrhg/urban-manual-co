// Simplified to only use Google Maps
export type MapProvider = 'google';

const googleAvailable = Boolean(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);

export function getAvailableProviders(): MapProvider[] {
  return googleAvailable ? ['google'] : [];
}

export function isProviderAvailable(provider: MapProvider): boolean {
  return provider === 'google' && googleAvailable;
}

export function getDefaultProvider(): MapProvider | null {
  return googleAvailable ? 'google' : null;
}

export const mapProviderOrder: MapProvider[] = ['google'];
