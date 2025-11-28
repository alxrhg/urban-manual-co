import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const photoName = searchParams.get('name');
    const maxWidth = searchParams.get('maxWidth') || '800';

    if (!photoName) {
      return NextResponse.json({ error: 'Photo name is required' }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    // Fetch photo from Google Places API (New)
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}`;

    const response = await fetch(photoUrl, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Google Places Photo error:', response.status);
      return NextResponse.json({ error: 'Failed to fetch photo' }, { status: response.status });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error: any) {
    console.error('Google Place Photo error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch photo' }, { status: 500 });
  }
}
