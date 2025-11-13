let loaderPromise: Promise<void> | null = null;
let initialized = false;

export interface MapkitCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapkitCoordinateSpan {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapkitCoordinateRegion {
  center?: MapkitCoordinate;
  span?: MapkitCoordinateSpan;
}

export interface MapkitAnnotation {
  coordinate: MapkitCoordinate;
  data?: unknown;
}

export interface MapkitMapInstance {
  addEventListener: (name: string, handler: (event: { annotation?: MapkitAnnotation }) => void) => void;
  removeEventListener: (name: string, handler: (event: { annotation?: MapkitAnnotation }) => void) => void;
  addAnnotations: (annotations: MapkitAnnotation[]) => void;
  removeAnnotations: (annotations: MapkitAnnotation[]) => void;
  showItems: (annotations: MapkitAnnotation[], options?: { animate?: boolean }) => void;
  addAnnotation?: (annotation: MapkitAnnotation) => void;
  destroy?: () => void;
  region: MapkitCoordinateRegion;
}

export interface MapkitGeocoderResult {
  name?: string;
  coordinate: MapkitCoordinate;
}

export interface MapkitGeocoder {
  lookup: (query: string, callback: (results: MapkitGeocoderResult[], error?: Error) => void) => void;
}

export interface MapkitGlobal {
  loaded: boolean;
  language?: string;
  init: (options: { authorizationCallback: (done: (token: string) => void) => void }) => void;
  Map: new (element: HTMLElement, options?: Record<string, unknown>) => MapkitMapInstance;
  MarkerAnnotation: new (coordinate: MapkitCoordinate, options?: Record<string, unknown>) => MapkitAnnotation;
  Coordinate: new (latitude: number, longitude: number) => MapkitCoordinate;
  CoordinateSpan: new (latitudeDelta: number, longitudeDelta: number) => MapkitCoordinateSpan;
  CoordinateRegion: new (coordinate: MapkitCoordinate, span: MapkitCoordinateSpan) => MapkitCoordinateRegion;
  Geocoder: new () => MapkitGeocoder;
}

declare global {
  interface Window {
    mapkit?: MapkitGlobal;
  }
}

function fetchAuthorizationToken(done: (token: string) => void) {
  fetch('/api/mapkit-token', { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      done(data.token || '');
    })
    .catch(error => {
      console.error('MapKit authorization error:', error);
      done('');
    });
}

function waitForMapkitReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MapKit is only available in the browser'));
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error('MapKit initialization timeout'));
    }, 6000);

    const checkLoaded = () => {
      if (window.mapkit?.loaded) {
        window.clearTimeout(timeout);
        resolve();
        return;
      }
      window.requestAnimationFrame(checkLoaded);
    };

    checkLoaded();
  });
}

export function ensureMapkitLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapKit is only available in the browser'));
  }

  if (window.mapkit?.loaded) {
    return Promise.resolve();
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    const handleReady = () => {
      if (!window.mapkit) {
        reject(new Error('MapKit did not load correctly'));
        return;
      }

      if (!initialized) {
        try {
          window.mapkit.init({
            authorizationCallback: fetchAuthorizationToken,
          });
          window.mapkit.language = navigator.language || 'en-US';
          initialized = true;
        } catch (error) {
          reject(error as Error);
          return;
        }
      }

      waitForMapkitReady().then(resolve).catch(reject);
    };

    const handleError = () => {
      reject(new Error('Failed to load MapKit JS'));
    };

    if (document.querySelector('script[data-mapkit-loader="true"]')) {
      const existing = document.querySelector('script[data-mapkit-loader="true"]')!;
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    script.dataset.mapkitLoader = 'true';
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  })
    .catch(error => {
      loaderPromise = null;
      throw error;
    });

  return loaderPromise;
}
