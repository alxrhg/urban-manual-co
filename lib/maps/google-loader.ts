/**
 * Unified Google Maps Script Loader
 * 
 * This utility ensures Google Maps API is loaded only once across the entire application,
 * preventing the "Google Maps JavaScript API multiple times" error.
 * 
 * It supports loading multiple libraries (places, marker, etc.) and handles:
 * - Deduplication of script tags
 * - Promise-based loading
 * - Library merging when multiple components request different libraries
 */

type GoogleMapsLibrary = 'places' | 'marker' | 'geometry' | 'drawing' | 'visualization';

interface LoadGoogleMapsOptions {
    libraries?: GoogleMapsLibrary[];
}

interface GoogleMapsLoadState {
    loading: boolean;
    loaded: boolean;
    error: Error | null;
    libraries: Set<GoogleMapsLibrary>;
    promise: Promise<void> | null;
}

// Global state to track loading
const loadState: GoogleMapsLoadState = {
    loading: false,
    loaded: false,
    error: null,
    libraries: new Set(),
    promise: null,
};

/**
 * Load Google Maps API with specified libraries
 * Returns a promise that resolves when the API is ready
 */
export async function loadGoogleMaps(options: LoadGoogleMapsOptions = {}): Promise<void> {
    const { libraries = [] } = options;

    // If already loaded, check if we need additional libraries
    if (loadState.loaded) {
        const needsNewLibraries = libraries.some(lib => !loadState.libraries.has(lib));

        if (needsNewLibraries) {
            console.warn('[Google Maps] Cannot load additional libraries after initial load. Required libraries:', libraries);
            console.warn('[Google Maps] Already loaded libraries:', Array.from(loadState.libraries));
        }

        return Promise.resolve();
    }

    // If currently loading, add libraries to the set and return existing promise
    if (loadState.loading && loadState.promise) {
        libraries.forEach(lib => loadState.libraries.add(lib));
        return loadState.promise;
    }

    // Start loading
    loadState.loading = true;
    libraries.forEach(lib => loadState.libraries.add(lib));

    loadState.promise = new Promise<void>((resolve, reject) => {
        // Check if window.google is already available
        if (typeof window !== 'undefined' && window.google?.maps) {
            loadState.loaded = true;
            loadState.loading = false;
            resolve();
            return;
        }

        // Get API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        if (!apiKey) {
            const error = new Error('Google Maps API key not found in environment variables');
            loadState.error = error;
            loadState.loading = false;
            reject(error);
            return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[data-google-maps-loader]');
        if (existingScript) {
            // Script exists, wait for it to load
            const checkInterval = setInterval(() => {
                if (window.google?.maps) {
                    clearInterval(checkInterval);
                    loadState.loaded = true;
                    loadState.loading = false;
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.google?.maps) {
                    const error = new Error('Google Maps API failed to load (timeout)');
                    loadState.error = error;
                    loadState.loading = false;
                    reject(error);
                }
            }, 10000);
            return;
        }

        // Create script element
        const script = document.createElement('script');
        const librariesParam = loadState.libraries.size > 0
            ? `&libraries=${Array.from(loadState.libraries).join(',')}`
            : '';

        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${librariesParam}&loading=async`;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-google-maps-loader', 'true');

        script.onload = () => {
            // Wait for google.maps to be fully available
            const checkReady = setInterval(() => {
                if (window.google?.maps) {
                    clearInterval(checkReady);
                    loadState.loaded = true;
                    loadState.loading = false;
                    console.log('[Google Maps] API loaded successfully with libraries:', Array.from(loadState.libraries));
                    resolve();
                }
            }, 50);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                if (!window.google?.maps) {
                    const error = new Error('Google Maps API loaded but google.maps not available');
                    loadState.error = error;
                    loadState.loading = false;
                    reject(error);
                }
            }, 5000);
        };

        script.onerror = () => {
            const error = new Error('Failed to load Google Maps API script');
            loadState.error = error;
            loadState.loading = false;
            reject(error);
        };

        document.head.appendChild(script);
    });

    return loadState.promise;
}

/**
 * Check if Google Maps API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
    return loadState.loaded && typeof window !== 'undefined' && !!window.google?.maps;
}

/**
 * Get current load state (for debugging)
 */
export function getGoogleMapsLoadState(): Readonly<GoogleMapsLoadState> {
    return { ...loadState };
}
