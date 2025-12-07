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

// Track authorization state for better error handling
let authorizationFailed = false;
let mapkitError: string | null = null;

// Listen for MapKit authorization errors
function setupMapkitErrorHandler() {
  if (typeof window === 'undefined' || !window.mapkit) return;

  // MapKit fires 'error' event when authorization fails
  const handleMapkitError = (event: Event) => {
    // Extract additional properties that MapKit may add
    const customEvent = event as Event & { status?: string; message?: string };
    console.error('[MapKit Client] MapKit error event:', {
      type: event.type,
      status: customEvent.status,
      message: customEvent.message,
    });
    mapkitError = customEvent.message || customEvent.status || 'Unknown MapKit error';
    authorizationFailed = true;
  };

  // Try to add error listener if mapkit supports it
  try {
    (window.mapkit as unknown as EventTarget).addEventListener?.('error', handleMapkitError);
  } catch (e) {
    console.log('[MapKit Client] Could not add error listener:', e);
  }
}

function fetchAuthorizationToken(done: (token: string) => void) {
  console.log('[MapKit Client] >>> authorizationCallback invoked by MapKit');

  // Create abort controller for timeout (with fallback for older browsers)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  fetch('/api/mapkit-token', {
    credentials: 'same-origin',
    signal: controller.signal
  })
    .then(res => {
      clearTimeout(timeoutId);
      console.log('[MapKit Client] Token response status:', res.status);
      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      if (!data.token) {
        throw new Error('No token received from server');
      }
      console.log('[MapKit Client] Token received, length:', data.token.length);
      console.log('[MapKit Client] Token preview:', data.token.substring(0, 50) + '...');
      authorizationFailed = false;

      // Call done with the token
      console.log('[MapKit Client] Calling done() with token...');
      done(data.token);
      console.log('[MapKit Client] done() called, checking mapkit.loaded:', window.mapkit?.loaded);

      // Check again after a short delay
      setTimeout(() => {
        console.log('[MapKit Client] After 500ms, mapkit.loaded:', window.mapkit?.loaded);
      }, 500);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      authorizationFailed = true;
      if (error.name === 'AbortError') {
        console.error('[MapKit Client] Authorization error: Request timeout');
      } else {
        console.error('[MapKit Client] Authorization error:', error);
      }
      // Pass empty token - will cause MapKit to fail
      done('');
    });
}

export function didAuthorizationFail(): boolean {
  return authorizationFailed;
}

function waitForMapkitReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MapKit is only available in the browser'));
      return;
    }

    // Reduced timeout - fail faster if authorization failed
    const timeout = window.setTimeout(() => {
      console.log('[MapKit Client] Timeout reached. authorizationFailed:', authorizationFailed, 'mapkitError:', mapkitError);
      if (authorizationFailed) {
        reject(new Error(`MapKit authorization failed - ${mapkitError || 'check credentials'}`));
      } else {
        reject(new Error('MapKit initialization timeout - the authorization token may be invalid or the network is slow'));
      }
    }, 10000);

    let attempts = 0;
    const maxAttempts = 200; // 10 seconds at ~50ms per check

    const checkLoaded = () => {
      attempts++;

      // Log progress every 50 attempts (roughly every 2.5 seconds)
      if (attempts % 50 === 0) {
        console.log('[MapKit Client] Still waiting...', {
          attempts,
          mapkitExists: !!window.mapkit,
          mapkitLoaded: window.mapkit?.loaded,
          authorizationFailed,
          mapkitError,
        });
      }

      // Fail fast if authorization failed
      if (authorizationFailed) {
        console.log('[MapKit Client] Authorization failed, aborting wait');
        window.clearTimeout(timeout);
        reject(new Error(`MapKit authorization failed - ${mapkitError || 'credentials may not be configured'}`));
        return;
      }

      // Check if MapKit is loaded and initialized
      if (window.mapkit?.loaded) {
        console.log('[MapKit Client] MapKit loaded successfully after', attempts, 'attempts');
        window.clearTimeout(timeout);
        resolve();
        return;
      }

      // If we've exceeded max attempts, reject
      if (attempts >= maxAttempts) {
        console.log('[MapKit Client] Max attempts exceeded:', { mapkitExists: !!window.mapkit, mapkitLoaded: window.mapkit?.loaded });
        window.clearTimeout(timeout);
        reject(new Error('MapKit initialization timeout - exceeded maximum attempts'));
        return;
      }

      // Continue checking
      window.requestAnimationFrame(checkLoaded);
    };

    // Start checking after a small delay to allow init to complete
    window.setTimeout(() => {
      checkLoaded();
    }, 100);
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
          console.log('[MapKit Client] Calling mapkit.init()...');
          setupMapkitErrorHandler();
          window.mapkit.init({
            authorizationCallback: fetchAuthorizationToken,
          });
          window.mapkit.language = navigator.language || 'en-US';
          initialized = true;
          console.log('[MapKit Client] mapkit.init() completed, waiting for loaded state...');
        } catch (error) {
          console.error('[MapKit Client] mapkit.init() threw error:', error);
          reject(error as Error);
          return;
        }
      }

      // Wait for MapKit to be ready, with better error handling
      waitForMapkitReady()
        .then(() => {
          // Double-check that MapKit is actually ready
          if (!window.mapkit?.loaded) {
            reject(new Error('MapKit loaded property is false after initialization'));
            return;
          }
          resolve();
        })
        .catch((error) => {
          console.error('MapKit ready check failed:', error);
          reject(error);
        });
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
