import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minTrend = searchParams.get('min_trend') || '0.15';

    const response = await fetch(
      `${ML_SERVICE_URL}/api/forecast/trending?min_trend=${minTrend}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 1 hour
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      if (response.status === 503) {
        // Forecasting not available - return empty array
        return NextResponse.json([], { status: 200 });
      }
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const trending = await response.json();

    return NextResponse.json(trending, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching trending destinations:', error);
    // Return empty array on error (graceful degradation)
    return NextResponse.json([], { status: 200 });
  }
}
