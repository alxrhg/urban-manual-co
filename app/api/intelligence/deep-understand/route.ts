import { NextRequest, NextResponse } from 'next/server';
import { intentAnalysisService } from '@/services/intelligence/intent-analysis';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { query, conversation_history = [] } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const enhancedIntent = await intentAnalysisService.analyzeIntent(
      query,
      conversation_history,
      user?.id
    );

    return NextResponse.json({
      intent: enhancedIntent,
      query,
    });
  } catch (error: any) {
    console.error('Error analyzing intent:', error);
    return NextResponse.json(
      { error: 'Failed to analyze intent', details: error.message },
      { status: 500 }
    );
  }
}

