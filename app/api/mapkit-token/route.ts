import { NextResponse } from 'next/server';

export async function GET() {
  const mapkitKey = process.env.NEXT_PUBLIC_MAPKIT_JS_KEY;
  const teamId = process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const privateKey = process.env.MAPKIT_PRIVATE_KEY;

  if (!mapkitKey || !teamId) {
    return NextResponse.json(
      { error: 'MapKit credentials not configured' },
      { status: 500 }
    );
  }

  // If we have a private key, generate a JWT token
  // Otherwise, return the key directly (for development/testing)
  if (keyId && privateKey) {
    try {
      // Generate JWT token for MapKit JS
      // This is a simplified version - in production, use a proper JWT library
      const token = await generateMapKitToken(teamId, keyId, privateKey);
      return NextResponse.json({ token });
    } catch (error: any) {
      console.error('Error generating MapKit token:', error);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }
  }

  // Fallback: return the key (MapKit JS might accept this for some use cases)
  return NextResponse.json({ token: mapkitKey });
}

async function generateMapKitToken(teamId: string, keyId: string, privateKey: string): Promise<string> {
  // This is a placeholder - you'll need to implement proper JWT generation
  // using a library like 'jsonwebtoken' or 'jose'
  // For now, return the key as a fallback
  return privateKey;
}

