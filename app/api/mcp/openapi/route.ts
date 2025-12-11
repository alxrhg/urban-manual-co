/**
 * OpenAPI Schema Endpoint
 *
 * Serves the OpenAPI spec for ChatGPT Custom GPT Actions integration.
 */

import { NextResponse } from "next/server";
import openApiSpec from "../openapi.json";

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
