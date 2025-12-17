/**
 * Draft Mode Disable API Route
 *
 * Disables Next.js Draft Mode and exits visual editing.
 */

import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  (await draftMode()).disable();

  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
