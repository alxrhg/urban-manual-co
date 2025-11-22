"use client";

import * as React from 'react';
import { PlasmicCanvasHost } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../../plasmic-init';
// Register components when this page loads
import '@/components/plasmic/register';

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}

