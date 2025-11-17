'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GooglePlacesAutocompleteNativeProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeDetails: any) => void;
  placeholder?: string;
  className?: string;
  types?: string[];
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export default function GooglePlacesAutocompleteNative({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  types = ['establishment'],
}: GooglePlacesAutocompleteNativeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Google Maps JavaScript API with Places Library (New)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[data-google-maps-autocomplete]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          setIsScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    setIsLoading(true);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found');
      setIsLoading(false);
      return;
    }

    // Load the new Places API library
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps-autocomplete', 'true');
    
    script.onload = () => {
      // Wait for PlaceAutocompleteElement to be available
      const checkPlaceElement = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          setIsScriptLoaded(true);
          setIsLoading(false);
          clearInterval(checkPlaceElement);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkPlaceElement);
        if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
          console.error('PlaceAutocompleteElement not available');
          setIsLoading(false);
        }
      }, 5000);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup autocomplete element on unmount
      if (autocompleteElementRef.current && containerRef.current) {
        containerRef.current.innerHTML = '';
        autocompleteElementRef.current = null;
      }
    };
  }, []);

  // Initialize PlaceAutocompleteElement when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current) return;

    // Try to use new PlaceAutocompleteElement if available, otherwise fall back to old Autocomplete
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      // Clear container
      containerRef.current.innerHTML = '';

      // Create the PlaceAutocompleteElement
      // PlaceAutocompleteElement constructor may not accept options in the same way as Autocomplete
      // Create without options first, then configure if needed
      const autocompleteElement = new google.maps.places.PlaceAutocompleteElement();
      
      // Configure result types if supported (using type assertion since API may differ)
      if (types && types.length > 0) {
        try {
          // @ts-ignore - Property may exist at runtime even if not in TypeScript definitions
          autocompleteElement.requestedResultTypes = types;
        } catch (e) {
          // If property doesn't exist, ignore
          console.warn('PlaceAutocompleteElement does not support requestedResultTypes');
        }
      }

      // Set up the input element
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.placeholder = placeholder;
      input.className = className;
      input.disabled = isLoading;

      // Append input to container
      containerRef.current.appendChild(input);
      autocompleteElement.attachTo(input);

      autocompleteElementRef.current = autocompleteElement as any;

      // Handle input changes to sync with parent
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value !== value) {
          onChange(target.value);
        }
      });

      // Handle place selection
      autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.place;
        
        if (!place.id) {
          return;
        }

        // Fetch full place details
        const placeDetails = await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'photos'],
        });

        // Update input value
        const placeName = placeDetails.displayName || placeDetails.formattedAddress || '';
        onChange(placeName);

        // Track Google Autocomplete usage for trip planning
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'trip_place_autocomplete', {
            place_id: placeDetails.id,
            place_name: placeName,
            place_types: placeDetails.types?.join(',') || '',
            has_geometry: !!placeDetails.location,
          });
        }

        // Call onPlaceSelect callback with place details
        if (onPlaceSelect) {
          onPlaceSelect({
            place_id: placeDetails.id,
            placeId: placeDetails.id,
            name: placeDetails.displayName,
            formatted_address: placeDetails.formattedAddress,
            geometry: placeDetails.location ? {
              location: {
                lat: () => placeDetails.location.lat,
                lng: () => placeDetails.location.lng,
              },
            } : undefined,
            types: placeDetails.types,
            photos: placeDetails.photos,
          });
        }
      });

      // Sync external value changes
      const syncValue = () => {
        if (input.value !== value) {
          input.value = value;
        }
      };
      syncValue();

      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        autocompleteElementRef.current = null;
      };
    } else if (window.google?.maps?.places?.Autocomplete) {
      // Fallback to old Autocomplete API (for backward compatibility)
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.placeholder = placeholder;
      input.className = className;
      input.disabled = isLoading;
      containerRef.current.appendChild(input);

      const autocompleteOptions: google.maps.places.AutocompleteOptions = {
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'photos'],
      };
      
      if (types && types.length > 0) {
        autocompleteOptions.types = types;
      }
      
      const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);
      autocompleteElementRef.current = autocomplete as any;

      // Handle input changes to sync with parent
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value !== value) {
          onChange(target.value);
        }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.place_id) {
          return;
        }

        const placeName = place.name || place.formatted_address || '';
        onChange(placeName);

        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'trip_place_autocomplete', {
            place_id: place.place_id,
            place_name: placeName,
            place_types: place.types?.join(',') || '',
            has_geometry: !!place.geometry,
          });
        }

        if (onPlaceSelect) {
          onPlaceSelect({
            place_id: place.place_id,
            placeId: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            geometry: place.geometry,
            types: place.types,
            photos: place.photos,
          });
        }
      });

      return () => {
        if (autocompleteElementRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteElementRef.current as any);
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        autocompleteElementRef.current = null;
      };
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      autocompleteElementRef.current = null;
    };
  }, [isScriptLoaded, onChange, onPlaceSelect, types, placeholder, className, isLoading]);

  // Sync external value changes to input
  useEffect(() => {
    if (!containerRef.current) return;
    const input = containerRef.current.querySelector('input');
    if (input && input.value !== value) {
      input.value = value;
    }
  }, [value]);

  // Inject styles for Google Autocomplete dropdown
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'google-autocomplete-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .pac-container {
        background-color: white !important;
        border: 1px solid rgb(229, 231, 235) !important;
        border-radius: 1rem !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        margin-top: 0.25rem !important;
        z-index: 9999 !important;
      }
      
      .dark .pac-container {
        background-color: rgb(17, 24, 39) !important;
        border-color: rgb(31, 41, 55) !important;
      }
      
      .pac-item {
        padding: 0.5rem 0.75rem !important;
        cursor: pointer !important;
        border-top: 1px solid rgb(229, 231, 235) !important;
        font-size: 0.875rem !important;
      }
      
      .dark .pac-item {
        border-top-color: rgb(31, 41, 55) !important;
      }
      
      .pac-item:first-child {
        border-top: none !important;
      }
      
      .pac-item:hover,
      .pac-item-selected {
        background-color: rgb(249, 250, 251) !important;
      }
      
      .dark .pac-item:hover,
      .dark .pac-item-selected {
        background-color: rgb(31, 41, 55) !important;
      }
      
      .pac-item-query {
        color: rgb(17, 24, 39) !important;
        font-size: 0.875rem !important;
      }
      
      .dark .pac-item-query {
        color: white !important;
      }
      
      .pac-matched {
        font-weight: 500 !important;
      }
      
      .pac-icon {
        margin-right: 0.5rem !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full">
        {/* Input will be dynamically created and inserted here */}
      </div>
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        </div>
      )}
    </div>
  );
}

