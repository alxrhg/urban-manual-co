import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Verification endpoint to check MapKit credentials without generating a token
 * Useful for troubleshooting
 */
export async function GET() {
  const teamId = process.env.MAPKIT_TEAM_ID || process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKeyRaw = process.env.MAPKIT_PRIVATE_KEY;

  const checks = {
    teamId: {
      present: !!teamId,
      length: teamId?.length || 0,
      preview: teamId ? `${teamId.substring(0, 3)}...${teamId.substring(teamId.length - 3)}` : null,
      valid: teamId ? teamId.length === 10 : false,
    },
    keyId: {
      present: !!keyId,
      length: keyId?.length || 0,
      preview: keyId ? `${keyId.substring(0, 3)}...${keyId.substring(keyId.length - 3)}` : null,
      valid: keyId ? keyId.length === 10 : false,
    },
    privateKey: {
      present: !!privateKeyRaw,
      length: privateKeyRaw?.length || 0,
      hasBeginMarker: privateKeyRaw?.includes('BEGIN PRIVATE KEY') || false,
      hasEndMarker: privateKeyRaw?.includes('END PRIVATE KEY') || false,
      valid: privateKeyRaw
        ? (privateKeyRaw.includes('BEGIN PRIVATE KEY') && privateKeyRaw.includes('END PRIVATE KEY'))
        : false,
    },
  };

  const allValid = checks.teamId.valid && checks.keyId.valid && checks.privateKey.valid;

  const issues = [];
  if (!checks.teamId.present) issues.push('MAPKIT_TEAM_ID is missing');
  else if (!checks.teamId.valid) issues.push(`MAPKIT_TEAM_ID should be 10 characters, got ${checks.teamId.length}`);

  if (!checks.keyId.present) issues.push('MAPKIT_KEY_ID is missing');
  else if (!checks.keyId.valid) issues.push(`MAPKIT_KEY_ID should be 10 characters, got ${checks.keyId.length}`);

  if (!checks.privateKey.present) issues.push('MAPKIT_PRIVATE_KEY is missing');
  else if (!checks.privateKey.hasBeginMarker) issues.push('MAPKIT_PRIVATE_KEY missing -----BEGIN PRIVATE KEY----- marker');
  else if (!checks.privateKey.hasEndMarker) issues.push('MAPKIT_PRIVATE_KEY missing -----END PRIVATE KEY----- marker');

  return NextResponse.json({
    status: allValid ? 'valid' : 'invalid',
    allValid,
    checks,
    issues,
    help: !allValid ? 'See MAPKIT_SETUP_GUIDE.md for setup instructions' : null,
  });
}
