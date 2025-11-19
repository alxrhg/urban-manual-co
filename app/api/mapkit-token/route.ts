import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePrivateKey(pk: string): string {
  // Handle env var with escaped newlines (\\n -> actual newlines)
  let key = pk.replace(/\\\\n/g, '\n');

  // Remove any extra whitespace or quotes
  key = key.trim().replace(/^["']|["']$/g, '');

  // Ensure proper PEM format with headers
  if (!key.includes('BEGIN PRIVATE KEY')) {
    // If no headers, add them
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  } else {
    // Ensure headers are on their own lines
    key = key
      .replace(/-----BEGIN PRIVATE KEY-----\s*/g, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/\s*-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----');
  }

  // Ensure there are newlines in the key body (not one long line)
  // Split by newlines, filter out headers, rejoin in 64-char chunks
  const lines = key.split('\n');
  const beginLine = lines.find(l => l.includes('BEGIN PRIVATE KEY'));
  const endLine = lines.find(l => l.includes('END PRIVATE KEY'));
  const keyBody = lines
    .filter(l => !l.includes('BEGIN') && !l.includes('END'))
    .join('')
    .replace(/\s/g, ''); // Remove all whitespace

  // Split into 64-character lines (standard PEM format)
  const formattedBody = keyBody.match(/.{1,64}/g)?.join('\n') || keyBody;

  return `${beginLine}\n${formattedBody}\n${endLine}`;
}

export async function GET(request: Request) {
  const teamId = process.env.MAPKIT_TEAM_ID || process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKeyRaw = process.env.MAPKIT_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKeyRaw) {
    return NextResponse.json(
      {
        error: 'MapKit credentials not configured. Required: MAPKIT_TEAM_ID, MAPKIT_KEY_ID, MAPKIT_PRIVATE_KEY'
      },
      { status: 500 }
    );
  }

  try {
    const privateKey = normalizePrivateKey(privateKeyRaw);
    const now = Math.floor(Date.now() / 1000);

    // Derive allowed origin. Prefer request Origin header, fallback to configured site URL
    const originHeader = (request.headers.get('origin') || '').replace(/\/$/, '');
    const refererHeader = request.headers.get('referer') || '';
    let refererOrigin = '';
    try {
      if (refererHeader) {
        refererOrigin = new URL(refererHeader).origin.replace(/\/$/, '');
      }
    } catch { }
    const fallbackOrigin = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const origin = originHeader || refererOrigin || fallbackOrigin;

    // Build JWT per Apple MapKit JS requirements
    // Required claims: iss (Team ID), iat, exp. Including origin is recommended to scope the token.
    const payload: Record<string, any> = {
      iss: teamId,
      iat: now,
      exp: now + 60 * 60, // 1 hour
    };
    if (origin) {
      payload.origin = origin;
    }

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    });

    const res = NextResponse.json({ token });
    // Prevent caching of short-lived tokens
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error: any) {
    console.error('Error generating MapKit token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

