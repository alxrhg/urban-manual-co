import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/onboarding/complete
 * Marks the user's onboarding as completed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user profile to mark onboarding as completed
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      );
    }

    // Track onboarding completion event
    try {
      await supabase.from('user_interactions').insert({
        user_id: user.id,
        interaction_type: 'onboarding_completed',
        metadata: {
          completed_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Non-critical, just log it
      console.log('Failed to track onboarding completion:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error: any) {
    console.error('Onboarding completion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/complete
 * Check if user has completed onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ completed: false });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      completed: profile?.onboarding_completed || false,
    });
  } catch (error) {
    console.error('Check onboarding status error:', error);
    return NextResponse.json({ completed: false });
  }
}
