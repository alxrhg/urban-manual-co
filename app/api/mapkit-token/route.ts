import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { withErrorHandling, CustomError, ErrorCode, createSuccessResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePrivateKey(pk: string): string {
  // Handle env var with escaped newlines and carriage returns
  let key = pk
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Remove any extra whitespace around newlines
  key = key.split('\n').map(line => line.trim()).join('\n');

  // Handle both EC PRIVATE KEY and PRIVATE KEY formats
  const EC_HEADER = '-----BEGIN EC PRIVATE KEY-----';
  const EC_FOOTER = '-----END EC PRIVATE KEY-----';
  const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
  const PEM_FOOTER = '-----END PRIVATE KEY-----';

  // If it has EC headers, it's already in the right format
  if (key.includes(EC_HEADER)) {
    return key;
  }

  // If it has regular PRIVATE KEY headers, it should work
  if (key.includes(PEM_HEADER)) {
    return key;
  }

  // If no headers, assume it's base64 key material and add PRIVATE KEY headers
  // (Apple MapKit keys are typically in PKCS#8 format)
  key = `${PEM_HEADER}\n${key}\n${PEM_FOOTER}`;
  return key;
}

function validatePrivateKey(key: string): { valid: boolean; error?: string; keyType?: string } {
  try {
    const keyObject = crypto.createPrivateKey(key);
    const keyDetails = keyObject.asymmetricKeyDetails;
    return {
      valid: true,
      keyType: `${keyObject.asymmetricKeyType} (${keyDetails?.namedCurve || 'unknown curve'})`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const GET = withErrorHandling(async (request: Request) => {
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
    throw new CustomError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'MapKit credentials not configured',
      500,
      {
        missing: {
          teamId: !teamId,
          keyId: !keyId,
          privateKey: !privateKeyRaw,
        }
      }
    );
  }

  const privateKey = normalizePrivateKey(privateKeyRaw);

  // Validate the private key before trying to sign
  const keyValidation = validatePrivateKey(privateKey);
  console.log('[MapKit Token] Key validation:', keyValidation);

  if (!keyValidation.valid) {
    console.error('[MapKit Token] Invalid private key:', keyValidation.error);
    throw new CustomError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Invalid private key format',
      500,
      { details: keyValidation.error }
    );
  }

  // Verify it's an EC key with P-256 curve (required for ES256)
  if (!keyValidation.keyType?.includes('ec') || !keyValidation.keyType?.includes('prime256v1')) {
    console.warn('[MapKit Token] Key type warning:', keyValidation.keyType, '(expected ec with prime256v1/P-256)');
  }

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
  // Always include origin - Apple may require it for tile authorization
  const payload: Record<string, unknown> = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60 * 24, // 24 hours - longer expiry for better UX
  };
  // Always add origin if available - required for map tiles to load
  if (origin) {
    payload.origin = origin;
    console.log('[MapKit Token] Including origin in token:', origin);
  } else {
    console.warn('[MapKit Token] No origin available - tiles may not load');
  }

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: keyId,
    header: {
      alg: 'ES256',
      typ: 'JWT',
      kid: keyId,
    },
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

  const res = createSuccessResponse({ token });
  // Prevent caching of short-lived tokens
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
});
