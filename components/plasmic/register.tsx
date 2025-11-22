/**
 * Register your components with Plasmic
 * 
 * This file registers your existing React components so they can be used
 * visually in Plasmic Studio. Once registered, you can drag and drop them
 * to recreate your homepage design.
 * 
 * IMPORTANT: Start your dev server and visit /plasmic-host for components to register
 */

import { PLASMIC } from "../../plasmic-init";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DestinationCard } from "@/components/DestinationCard";

// Register components with Plasmic
if (PLASMIC) {
  // Register Header component
  PLASMIC.registerComponent(Header, {
    name: "Header",
    displayName: "Header",
    description: "Site header with navigation",
    importPath: "@/components/Header",
  });

  // Register Footer component
  PLASMIC.registerComponent(Footer, {
    name: "Footer",
    displayName: "Footer",
    description: "Site footer",
    importPath: "@/components/Footer",
  });

  // Register DestinationCard component
  PLASMIC.registerComponent(DestinationCard, {
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
}
