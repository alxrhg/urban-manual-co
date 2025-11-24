"use client";

import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

// Plasmic configuration - token should be set via NEXT_PUBLIC_PLASMIC_TOKEN env var
const PLASMIC_PROJECT_ID = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID || "pEZdPb88zvW8NfciQQQwSK";
const PLASMIC_TOKEN = process.env.NEXT_PUBLIC_PLASMIC_TOKEN || "";

export const PLASMIC = typeof window !== "undefined" && PLASMIC_TOKEN
  ? initPlasmicLoader({
      projects: [
        {
          id: PLASMIC_PROJECT_ID,
          token: PLASMIC_TOKEN,
        }
      ],
      // Only enable preview mode in development - production renders published changes only
      preview: process.env.NODE_ENV !== "production",
    })
  : null;

