import { NextRequest, NextResponse } from 'next/server';
import { bestTimeToVisitService } from '@/services/intelligence/best-time-to-visit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const destinationId = searchParams.get('destination_id');
    const monthsAhead = parseInt(searchParams.get('months_ahead') || '12');

    if (!city && !destinationId) {
      return NextResponse.json(
        { error: 'city or destination_id is required' },
        { status: 400 }
      );
    }

    const result = await bestTimeToVisitService.getBestTimeToVisit({
      city: city || undefined,
      country: country || undefined,
      destinationId: destinationId || undefined,
      monthsAhead: Math.min(Math.max(monthsAhead, 1), 24), // Limit to 1-24 months
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Could not generate best time to visit analysis' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting best time to visit:', error);
    return NextResponse.json(
      { error: 'Failed to get best time to visit', details: error.message },
      { status: 500 }
    );
  }
}
