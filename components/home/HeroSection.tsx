import React from "react";
import { CitySelector, type CitySelectorProps } from "./CitySelector";

export interface HeroSectionProps {
  // Content slots for client-side interactive components
  children: React.ReactNode;
  // City selector props (passed through)
  citySelectorProps?: CitySelectorProps;
  // Whether to show the city selector
  showCitySelector?: boolean;
}

/**
 * HeroSection - Server component wrapper for the homepage hero
 *
 * This is a server component that provides the layout structure.
 * Client-side interactive elements (search, chat, etc.) are passed as children.
 */
export function HeroSection({
  children,
  citySelectorProps,
  showCitySelector = true,
}: HeroSectionProps) {
  return (
    <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
      <div className="w-full flex md:justify-start flex-1 items-center">
        <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
          {/* Main content area - receives interactive client components */}
          <div className="flex-1 flex items-center">
            <div className="w-full">{children}</div>
          </div>

          {/* City and Category filters */}
          {showCitySelector && citySelectorProps && (
            <div className="flex-1 flex items-end">
              <CitySelector {...citySelectorProps} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
