/**
 * Register your components with Plasmic
 * 
 * This file registers your existing React components so they can be used
 * visually in Plasmic Studio. Add your components here.
 */

import { PLASMIC } from "./init";

// Example: Register a component
// PLASMIC.registerComponent(YourComponent, {
//   name: "YourComponent",
//   props: {
//     // Define props that can be edited in Plasmic
//     title: "string",
//     description: "string",
//   },
//   importPath: "@/components/YourComponent",
// });

// Register your homepage components here
// For example:
// PLASMIC.registerComponent(DestinationCard, {
//   name: "DestinationCard",
//   props: {
//     destination: "object",
//     onClick: "eventHandler",
//   },
//   importPath: "@/components/DestinationCard",
// });

export default function registerComponents() {
  // Components are registered when this module is imported
  // Import this file in your app layout or a root component
}

