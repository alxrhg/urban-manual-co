"use client";

import * as React from 'react';

// Conditionally import Plasmic only if available
let PlasmicCanvasHost: any = null;
let PLASMIC: any = null;

try {
  const plasmicLoader = require('@plasmicapp/loader-nextjs');
  PlasmicCanvasHost = plasmicLoader.PlasmicCanvasHost;
  PLASMIC = require('../../plasmic-init').PLASMIC;
  require('@/components/plasmic/register');
} catch (e) {
  // Plasmic not available, skip
}

export default function PlasmicHost() {
  if (!PLASMIC || !PlasmicCanvasHost) {
    return null;
  }
  return <PlasmicCanvasHost />;
}

