/**
 * Register your components with Plasmic
 * 
 * This file registers your existing React components so they can be used
 * visually in Plasmic Studio. Once registered, you can drag and drop them
 * to recreate your homepage design.
 * 
 * IMPORTANT: Start your dev server and visit /plasmic-host for components to register
 */

import { PLASMIC } from "./init";

// Only register if Plasmic is initialized
if (typeof window !== "undefined" && PLASMIC) {
  // Import components dynamically to avoid SSR issues
  import("@/components/Header").then((mod) => {
    PLASMIC.registerComponent(mod.Header, {
      name: "Header",
      displayName: "Header",
      description: "Site header with navigation",
      importPath: "@/components/Header",
    });
  }));

  import("@/components/Footer").then((mod) => {
    PLASMIC.registerComponent(mod.Footer, {
      name: "Footer",
      displayName: "Footer",
      description: "Site footer",
      importPath: "@/components/Footer",
    });
  });

  import("@/components/DestinationCard").then((mod) => {
    PLASMIC.registerComponent(mod.DestinationCard, {
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
        className: {
          type: "string",
          displayName: "Class Name",
          description: "Additional CSS classes",
        },
      },
    });
  });
}

export default function registerComponents() {
  // Components are registered when this module is imported
  // Import this file in your app layout
  // Visit /plasmic-host in your browser to enable registration
}
