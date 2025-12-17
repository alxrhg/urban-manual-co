/**
 * Draft Mode Enable API Route
 *
 * Enables Next.js Draft Mode for Sanity Presentation Tool.
 * Called by Sanity Studio when entering visual editing mode.
 */

import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Dynamically import to avoid build-time issues
  const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN;

  // Check if token is configured
  if (!token) {
    return new Response('Sanity preview token not configured', { status: 500 });
  }

  try {
    const { validatePreviewUrl } = await import('@sanity/preview-url-secret');
    const { client } = await import('@/lib/sanity/client');

    const { isValid, redirectTo = '/' } = await validatePreviewUrl(
      client.withConfig({ token }),
      request.url
    );

    if (!isValid) {
      return new Response('Invalid secret', { status: 401 });
    }

    (await draftMode()).enable();

    redirect(redirectTo);
  } catch (error) {
    console.error('Draft mode enable error:', error);
    return new Response('Failed to enable draft mode', { status: 500 });
  }
}
