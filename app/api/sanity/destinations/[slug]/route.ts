import { NextResponse } from 'next/server';
import { sanityClient, isSanityConfigured } from '@/lib/sanity/client';

/**
 * GET /api/sanity/destinations/[slug]
 * 
 * Fetch a single destination by slug from Sanity CMS
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  if (!isSanityConfigured()) {
    return NextResponse.json(
      { error: 'Sanity is not configured' },
      { status: 503 }
    );
  }

  try {
    const query = `*[_type == "destination" && slug.current == $slug][0] {
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

    const destination = await sanityClient!.fetch(query, {
      slug: params.slug,
    });

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ destination });
  } catch (error: any) {
    console.error('[Sanity API] Error fetching destination:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination', message: error.message },
      { status: 500 }
    );
  }
}

