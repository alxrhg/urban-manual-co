"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plane, Search } from "lucide-react";

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

// Common airports for quick access
const COMMON_AIRPORTS: Airport[] = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "USA" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "USA" },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "USA" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "USA" },
  { code: "BOS", name: "Boston Logan International", city: "Boston", country: "USA" },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "USA" },
  { code: "LHR", name: "Heathrow", city: "London", country: "UK" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "Japan" },
  { code: "HND", name: "Haneda", city: "Tokyo", country: "Japan" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore" },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "China" },
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea" },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
];

interface AirportAutocompleteProps {
  value: string;
  onChange: (code: string, airport?: Airport) => void;
  placeholder?: string;
  className?: string;
}

export function AirportAutocomplete({
  value,
  onChange,
  placeholder = "Search airport...",
  className,
}: AirportAutocompleteProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredAirports, setFilteredAirports] = React.useState<Airport[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (query.length === 0) {
      setFilteredAirports(COMMON_AIRPORTS.slice(0, 6));
    } else {
      const searchLower = query.toLowerCase();
      const filtered = COMMON_AIRPORTS.filter(
        (airport) =>
          airport.code.toLowerCase().includes(searchLower) ||
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower)
      );
      setFilteredAirports(filtered.slice(0, 8));
    }
  }, [query]);

  const selectedAirport = COMMON_AIRPORTS.find((a) => a.code === value);
  const displayValue = selectedAirport
    ? `${selectedAirport.code} - ${selectedAirport.city}`
    : value;

  const handleSelect = (airport: Airport) => {
    onChange(airport.code, airport);
    setQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200",
            "bg-white text-sm text-gray-900",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-gray-300",
            "transition-all"
          )}
        />
      </div>

      {isOpen && filteredAirports.length > 0 && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200",
            "shadow-lg overflow-hidden"
          )}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {query.length === 0 && (
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Popular airports
              </div>
            )}
            {filteredAirports.map((airport) => (
              <button
                key={airport.code}
                type="button"
                onClick={() => handleSelect(airport)}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                  "flex items-start gap-3",
                  value === airport.code && "bg-gray-50"
                )}
              >
                <span className="text-sm font-medium text-gray-900 w-10">
                  {airport.code}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">
                    {airport.city}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {airport.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
