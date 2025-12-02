import { NextRequest, NextResponse } from 'next/server';
import { trackSuggestionAcceptance } from '@/lib/metrics/conversationMetrics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, suggestionText, userId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const success = await trackSuggestionAcceptance(
      sessionId,
      suggestionText || '',
      userId
    );

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error tracking suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to track suggestion' },
      { status: 500 }
    );
  }
}
