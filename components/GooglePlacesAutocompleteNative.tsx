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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Google Maps JavaScript API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[data-google-maps-autocomplete]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
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

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps-autocomplete', 'true');
    
    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
        setIsLoading(false);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup autocomplete on unmount
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Initialize Autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google?.maps?.places) return;

    // Create autocomplete instance
    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'photos'],
    };
    
    // Only add types if provided and not empty
    if (types && types.length > 0) {
      autocompleteOptions.types = types;
    }
    
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);

    autocompleteRef.current = autocomplete;

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.place_id) {
        return;
      }

      // Update input value
      const placeName = place.name || place.formatted_address || '';
      onChange(placeName);

      // Call onPlaceSelect callback with place details
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
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isScriptLoaded, onChange, onPlaceSelect, types]);

  // Sync external value changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        </div>
      )}
    </div>
  );
}

