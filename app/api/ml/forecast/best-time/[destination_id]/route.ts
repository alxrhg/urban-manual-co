import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { destination_id: string } }
) {
  try {
    const { destination_id } = params;
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '5';

    const response = await fetch(
      `${ML_SERVICE_URL}/api/forecast/best-time/${destination_id}?top_n=${topN}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 24 hours
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      if (response.status === 404 || response.status === 503) {
        // No forecast available
        return NextResponse.json([], { status: 200 });
      }
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const bestTimes = await response.json();

    return NextResponse.json(bestTimes, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    console.error('Error fetching best visit times:', error);
    return NextResponse.json([], { status: 200 });
  }
}
