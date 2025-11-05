import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePrivateKey(pk: string): string {
  // Handle env var with escaped newlines
  let key = pk.replace(/\\n/g, '\n');
  // Ensure proper PEM headers if missing
  if (!key.includes('BEGIN PRIVATE KEY')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  return key;
}

export async function GET(request: Request) {
  const teamId = process.env.MAPKIT_TEAM_ID || process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKeyRaw = process.env.MAPKIT_PRIVATE_KEY;

  console.log('[MapKit Token API] Credentials check:', {
    hasTeamId: !!teamId,
    hasKeyId: !!keyId,
    hasPrivateKey: !!privateKeyRaw,
    teamId: teamId?.substring(0, 4) + '***',
    keyId: keyId?.substring(0, 4) + '***',
  });

  if (!teamId || !keyId || !privateKeyRaw) {
    console.error('[MapKit Token API] Missing credentials!');
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
    } catch {}
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

    console.log('[MapKit Token API] Token generated successfully', {
      payload,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
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

