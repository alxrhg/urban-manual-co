/**
 * Register your components with Plasmic
 * 
 * This file registers your existing React components so they can be used
 * visually in Plasmic Studio. Once registered, you can drag and drop them
 * to recreate your homepage design.
 */

import { PLASMIC } from "./init";

// Only register if Plasmic is initialized
if (PLASMIC) {
  // Register GreetingHero component
  PLASMIC.registerComponent(
    require("@/src/features/search/GreetingHero").default,
    {
      name: "GreetingHero",
      displayName: "Greeting Hero",
      description: "Hero section with greeting and search",
      importPath: "@/src/features/search/GreetingHero",
      props: {
        // Add props that can be edited in Plasmic
        // You can add more props as needed
      },
    }
  );

  // Register DestinationCard component
  PLASMIC.registerComponent(
    require("@/components/DestinationCard").DestinationCard,
    {
      name: "DestinationCard",
      displayName: "Destination Card",
      description: "Card displaying a destination",
      importPath: "@/components/DestinationCard",
      props: {
        destination: {
          type: "object",
          displayName: "Destination",
          description: "Destination data object",
        },
        onClick: {
          type: "eventHandler",
          displayName: "On Click",
          argTypes: [{ name: "destination", type: "object" }],
        },
      },
    }
  );

  // Register SearchFiltersComponent
  PLASMIC.registerComponent(
    require("@/src/features/search/SearchFilters").SearchFiltersComponent,
    {
      name: "SearchFiltersComponent",
      displayName: "Search Filters",
      description: "Search and filter component",
      importPath: "@/src/features/search/SearchFilters",
      props: {
        filters: {
          type: "object",
          displayName: "Filters",
        },
        onFiltersChange: {
          type: "eventHandler",
          displayName: "On Filters Change",
        },
        availableCities: {
          type: "array",
          displayName: "Available Cities",
        },
        availableCategories: {
          type: "array",
          displayName: "Available Categories",
        },
      },
    }
  );

  // Register UniversalGrid component
  PLASMIC.registerComponent(
    require("@/components/UniversalGrid").UniversalGrid,
    {
      name: "UniversalGrid",
      displayName: "Universal Grid",
      description: "Grid layout for destinations",
      importPath: "@/components/UniversalGrid",
      props: {
        items: {
          type: "array",
          displayName: "Items",
        },
        columns: {
          type: "number",
          displayName: "Columns",
          defaultValue: 3,
        },
        renderItem: {
          type: "function",
          displayName: "Render Item",
        },
      },
    }
  );

  // Register Header component
  PLASMIC.registerComponent(
    require("@/components/Header").Header,
    {
      name: "Header",
      displayName: "Header",
      description: "Site header with navigation",
      importPath: "@/components/Header",
    }
  );

  // Register Footer component
  PLASMIC.registerComponent(
    require("@/components/Footer").Footer,
    {
      name: "Footer",
      displayName: "Footer",
      description: "Site footer",
      importPath: "@/components/Footer",
    }
  );
}

export default function registerComponents() {
  // Components are registered when this module is imported
  // Import this file in your app layout
}
