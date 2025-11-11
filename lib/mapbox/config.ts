'use client';

interface MapboxConfig {
  accessToken: string | null;
  styles: {
    light: string;
    dark: string;
  };
}

let cachedConfig: MapboxConfig | null = null;

const ACCESS_TOKEN_KEYS = [
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'NEXT_PUBLIC_MAPBOX_TOKEN',
  'MAPBOX_ACCESS_TOKEN',
  'MAPBOX_TOKEN',
];

export function getMapboxConfig(): MapboxConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const accessToken =
    ACCESS_TOKEN_KEYS.map((key) => process.env[key])
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  const lightStyle =
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_LIGHT ||
    process.env.MAPBOX_STYLE_LIGHT ||
    'mapbox://styles/mapbox/light-v11';

  const darkStyle =
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_DARK ||
    process.env.MAPBOX_STYLE_DARK ||
    'mapbox://styles/mapbox/dark-v11';

  cachedConfig = {
    accessToken,
    styles: {
      light: lightStyle,
      dark: darkStyle,
    },
  };

  if (!accessToken && process.env.NODE_ENV === 'development') {
    console.warn(
      '[Mapbox] Missing access token. Set one of: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN, MAPBOX_ACCESS_TOKEN, MAPBOX_TOKEN.'
    );
  }

  return cachedConfig;
}


