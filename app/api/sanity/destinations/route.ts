import { NextResponse } from 'next/server';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';

/**
 * GET /api/sanity/destinations
 * 
 * Fetch destinations from Sanity CMS
 */
export async function GET(request: Request) {
  if (!isSanityConfigured()) {
    return NextResponse.json(
      { error: 'Sanity is not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build GROQ query
    let query = `*[_type == "destination"`;
    
    const conditions: string[] = [];
    if (city) {
      conditions.push(`city == "${city}"`);
    }
    if (category) {
      conditions.push(`category == "${category}"`);
    }
    
    if (conditions.length > 0) {
      query += ` && (${conditions.join(' && ')})`;
    }
    
    query += `] | order(_createdAt desc) [${offset}...${offset + limit}] {
      _id,
      _createdAt,
      _updatedAt,
      name,
      "slug": slug.current,
      city,
      category,
      description,
      content,
      image,
      latitude,
      longitude,
      michelinStars,
      crown,
      rating,
      priceLevel,
      googlePlaceId,
      formattedAddress
    }`;

    const destinations = await sanityClient!.fetch(query);

    return NextResponse.json({
      destinations,
      count: destinations.length,
    });
  } catch (error: any) {
    console.error('[Sanity API] Error fetching destinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destinations', message: error.message },
      { status: 500 }
    );
  }
}

