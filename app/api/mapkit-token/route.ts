import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePrivateKey(pk: string): string {
  // Handle env var with escaped newlines
  let key = pk.replace(/\\n/g, '\n');
  // Ensure proper PEM headers if missing
  // Note: These are PEM format markers, not hardcoded credentials
  const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
  const PEM_FOOTER = '-----END PRIVATE KEY-----';
  if (!key.includes(PEM_HEADER)) {
    key = `${PEM_HEADER}\n${key}\n${PEM_FOOTER}`;
  }
  return key;
}

export async function GET(request: Request) {
  const teamId = process.env.MAPKIT_TEAM_ID || process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKeyRaw = process.env.MAPKIT_PRIVATE_KEY;

  // Log which vars are present (not the values)
  console.log('[MapKit Token] Checking credentials:', {
    hasTeamId: !!teamId,
    teamIdLength: teamId?.length || 0,
    hasKeyId: !!keyId,
    keyIdLength: keyId?.length || 0,
    hasPrivateKey: !!privateKeyRaw,
    privateKeyLength: privateKeyRaw?.length || 0,
    privateKeyHasHeader: privateKeyRaw?.includes('BEGIN') || false,
    privateKeyHasNewlines: privateKeyRaw?.includes('\n') || privateKeyRaw?.includes('\\n') || false,
  });

  if (!teamId || !keyId || !privateKeyRaw) {
    console.error('[MapKit Token] Missing credentials:', {
      teamId: !!teamId,
      keyId: !!keyId,
      privateKey: !!privateKeyRaw,
    });
    return NextResponse.json(
      {
        error: 'MapKit credentials not configured',
        missing: {
          teamId: !teamId,
          keyId: !keyId,
          privateKey: !privateKeyRaw,
        }
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

    console.log('[MapKit Token] Generating token for origin:', origin || '(none)');

    // Build JWT per Apple MapKit JS requirements
    // Required claims: iss (Team ID), iat, exp
    // Note: Omitting origin claim to allow token to work across all Vercel preview deployments
    const payload: Record<string, unknown> = {
      iss: teamId,
      iat: now,
      exp: now + 60 * 60 * 24, // 24 hours - longer expiry for better UX
    };
    // Only add origin for production domain to prevent origin mismatch on preview deployments
    if (origin && origin.includes('urbanmanual.co')) {
      payload.origin = origin;
    }

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    });

    // Decode and log token structure for debugging (without signature)
    const [headerB64, payloadB64] = token.split('.');
    try {
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
      const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      console.log('[MapKit Token] Token header:', header);
      console.log('[MapKit Token] Token payload:', {
        ...decodedPayload,
        iat: new Date(decodedPayload.iat * 1000).toISOString(),
        exp: new Date(decodedPayload.exp * 1000).toISOString(),
      });
    } catch {
      console.log('[MapKit Token] Could not decode token for logging');
    }

    console.log('[MapKit Token] Token generated successfully, length:', token.length);

    const res = NextResponse.json({ token });
    // Prevent caching of short-lived tokens
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MapKit Token] Error generating token:', errorMessage);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

