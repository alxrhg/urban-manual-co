'use client';

import React, { useState, useEffect, useRef } from 'react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeDetails: any) => void;
  placeholder?: string;
  className?: string;
  types?: string; // e.g., 'establishment', '(cities)', '(regions)'
  location?: string; // "lat,lng" for location bias
  radius?: number; // radius in meters
}

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
  matched_substrings?: Array<{
    offset: number;
    length: number;
  }>;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className = '',
  types = 'establishment',
  location,
  radius,
}: GooglePlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate session token (new one per search session)
  useEffect(() => {
    if (!sessionToken) {
      setSessionToken(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionToken]);

  // Fetch predictions from Google Places Autocomplete
  useEffect(() => {
    if (!value || value.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          input: value,
          types,
          language: 'en',
        });
        
        if (sessionToken) {
          params.set('sessionToken', sessionToken);
        }
        
        if (location) {
          params.set('location', location);
          if (radius) {
            params.set('radius', radius.toString());
          }
        }

        const response = await fetch(`/api/google-places-autocomplete?${params.toString()}`);
        const data = await response.json();

        if (data.error) {
          console.error('Autocomplete error:', data.error);
          setPredictions([]);
        } else {
          setPredictions(data.predictions || []);
          setShowPredictions((data.predictions || []).length > 0);
          setSelectedIndex(-1);
          
          // Update session token if provided
          if (data.sessionToken) {
            setSessionToken(data.sessionToken);
          }
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPredictions, 300); // Debounce
    return () => clearTimeout(timer);
  }, [value, types, location, radius, sessionToken]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPlaceDetails = async (placeId: string) => {
    // Return placeId to parent - let parent component handle the API call
    // This avoids needing admin email in the component
    return {
      place_id: placeId,
      placeId: placeId, // Support both formats
      description: predictions.find(p => p.place_id === placeId)?.description || '',
    };
  };

  const parsePlaceDescription = (description: string) => {
    // Parse "Place Name, Address, City, Country" format
    const parts = description.split(',').map(p => p.trim());
    return {
      name: parts[0] || '',
      city: parts[parts.length - 2] || parts[parts.length - 3] || '',
      address: parts.slice(1, -1).join(', '),
    };
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    onChange(prediction.description);
    setShowPredictions(false);
    
    // Fetch detailed place information
    if (onPlaceSelect) {
      const details = await fetchPlaceDetails(prediction.place_id);
      if (details) {
        onPlaceSelect(details);
      } else {
        // Use parsed description if API call fails
        const parsed = parsePlaceDescription(prediction.description);
        onPlaceSelect(parsed);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPredictions || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          e.preventDefault();
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowPredictions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string, matchedSubstrings: any[]) => {
    if (!matchedSubstrings || matchedSubstrings.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactElement[] = [];
    let lastIndex = 0;

    matchedSubstrings
      .sort((a, b) => a.offset - b.offset)
      .forEach((match: any) => {
        if (match.offset > lastIndex) {
          parts.push(
            <span key={`${lastIndex}-text`}>{text.substring(lastIndex, match.offset)}</span>
          );
        }
        parts.push(
          <strong key={`${match.offset}-match`} className="font-semibold">
            {text.substring(match.offset, match.offset + match.length)}
          </strong>
        );
        lastIndex = match.offset + match.length;
      });

    if (lastIndex < text.length) {
      parts.push(<span key={`${lastIndex}-end`}>{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 2 && setShowPredictions(predictions.length > 0)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      
      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          )}
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-blue-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {highlightMatch(prediction.main_text, prediction.matched_substrings || [])}
                  </div>
                  {prediction.secondary_text && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {prediction.secondary_text}
                    </div>
                  )}
                  {prediction.types && prediction.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prediction.types.slice(0, 2).map((type: string) => (
                        <span
                          key={type}
                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

