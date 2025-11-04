import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET() {
  const teamId = process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID || process.env.MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKey = process.env.MAPKIT_PRIVATE_KEY;

  // Check for required credentials
  if (!teamId || !keyId || !privateKey) {
    return NextResponse.json(
      { 
        error: 'MapKit credentials not configured. Required: MAPKIT_TEAM_ID, MAPKIT_KEY_ID, MAPKIT_PRIVATE_KEY' 
      },
      { status: 500 }
    );
  }

  try {
    // Generate JWT token for MapKit JS
    // According to Apple's documentation, the token must include:
    // - iss (issuer): Your Team ID
    // - iat (issued at): Current timestamp
    // - exp (expiration): Token expiration (recommended: 1 hour)
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: teamId,
        iat: now,
        exp: now + 3600, // 1 hour expiration
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: keyId,
      }
    );

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error generating MapKit token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

