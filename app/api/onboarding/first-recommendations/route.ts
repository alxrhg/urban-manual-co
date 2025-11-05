import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateJSON } from '@/lib/llm';

/**
 * GET /api/onboarding/first-recommendations
 * Generate personalized first recommendations based on user's onboarding preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's preferences from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('favorite_cities, favorite_categories, travel_style, price_preference')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User preferences not found' },
        { status: 404 }
      );
    }

    const {
      favorite_cities = [],
      favorite_categories = [],
      travel_style,
      price_preference,
    } = profile;

    // Build query to get personalized destinations
    let query = supabase
      .from('destinations')
      .select('*')
      .limit(5);

    // Filter by favorite cities if available
    if (favorite_cities && favorite_cities.length > 0) {
      query = query.in('city', favorite_cities);
    }

    // Filter by favorite categories if available
    if (favorite_categories && favorite_categories.length > 0) {
      query = query.in('category', favorite_categories);
    }

    // Filter by price preference if set
    if (price_preference) {
      query = query.lte('price_level', price_preference + 1);
    }

    // Order by editorial rating and relevance
    query = query
      .not('rating', 'is', null)
      .order('rating', { ascending: false });

    const { data: destinations, error: destError } = await query;

    if (destError) {
      console.error('Error fetching destinations:', destError);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 }
      );
    }

    // If we didn't get enough results, fall back to trending
    if (!destinations || destinations.length < 3) {
      const { data: trending } = await supabase
        .from('destinations')
        .select('*')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(5);

      return NextResponse.json({
        destinations: trending || [],
        personalized: false,
        message: 'Here are some trending destinations to get you started!',
      });
    }

    // Generate personalized message using AI
    let welcomeMessage = 'Here are your personalized first picks!';

    try {
      const messagePrompt = `Generate a warm, enthusiastic welcome message for a new user.
Context:
- User selected cities: ${favorite_cities.join(', ')}
- Interests: ${favorite_categories.join(', ')}
- Travel style: ${travel_style}
- We're showing them ${destinations.length} personalized recommendations

Create a 1-2 sentence message that:
1. Welcomes them
2. References their interests
3. Encourages exploration
4. Is concise and exciting

Return JSON: { "message": "..." }`;

      const result = await generateJSON(
        'You are a friendly travel guide helping users discover amazing places.',
        messagePrompt
      );

      if (result?.message) {
        welcomeMessage = result.message;
      }
    } catch (err) {
      console.log('Failed to generate AI message, using default');
    }

    // Track first recommendations view
    try {
      await supabase.from('user_interactions').insert({
        user_id: user.id,
        interaction_type: 'first_recommendations_viewed',
        metadata: {
          destination_count: destinations.length,
          cities: favorite_cities,
          categories: favorite_categories,
        },
      });
    } catch (err) {
      console.log('Failed to track first recommendations view:', err);
    }

    return NextResponse.json({
      destinations,
      personalized: true,
      message: welcomeMessage,
      preferences: {
        cities: favorite_cities,
        categories: favorite_categories,
        travelStyle: travel_style,
      },
    });
  } catch (error: any) {
    console.error('First recommendations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
