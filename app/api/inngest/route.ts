/**
 * Inngest API Route Handler
 *
 * This route handles all Inngest webhook requests.
 * Inngest calls this endpoint to invoke background job functions.
 */

import { serve } from "inngest/next";
import { inngest, allFunctions } from "@/lib/inngest";

// Create and export the Inngest handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
