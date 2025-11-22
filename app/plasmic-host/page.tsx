/**
 * Plasmic App Host Page
 * 
 * This page allows Plasmic Studio to render your components visually.
 * Visit this page in Plasmic Studio to see your components in context.
 */
"use client";

import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/components/plasmic/init";

export default function PlasmicHost() {
  if (!PLASMIC) {
    return <div>Plasmic not configured</div>;
  }
  return <PlasmicCanvasHost />;
}

