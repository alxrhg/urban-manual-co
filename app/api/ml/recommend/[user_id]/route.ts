import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const { user_id } = params;
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '20';
    const excludeInteracted = searchParams.get('exclude_interacted') || 'true';

    // Call ML service
    const response = await fetch(
      `${ML_SERVICE_URL}/api/recommend/collaborative/${user_id}?top_n=${topN}&exclude_interacted=${excludeInteracted}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 5 minutes
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      if (response.status === 503) {
        // ML service not available or model not trained - fallback
        return NextResponse.json(
          { error: 'ML service unavailable', fallback: true },
          { status: 503 }
        );
      }
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const recommendations = await response.json();

    return NextResponse.json(recommendations, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching ML recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', fallback: true },
      { status: 500 }
    );
  }
}
