import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cities, existingSlugs = [], limit = 8 } = body;

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return NextResponse.json({ error: 'Cities required' }, { status: 400 });
    }

    // Get user's preferences and saved places for personalization
    const [savedResult, prefsResult] = await Promise.all([
      supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id)
        .limit(50),
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ]);

    const savedSlugs = new Set(savedResult.data?.map(s => s.destination_slug) || []);
    const userPrefs = prefsResult.data;

    // Build exclusion list
    const excludeSlugs = [...existingSlugs, ...Array.from(savedSlugs)];

    // Get destinations in the trip's cities
    let query = supabase
      .from('destinations')
      .select('slug, name, city, category, neighborhood, description, micro_description, image, image_thumbnail, latitude, longitude, rating, michelin_stars, crown, tags')
      .in('city', cities.map(c => c.toLowerCase()));

    if (excludeSlugs.length > 0) {
      query = query.not('slug', 'in', `(${excludeSlugs.map(s => `"${s}"`).join(',')})`);
    }

    const { data: destinations, error } = await query.limit(50);

    if (error) throw error;

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Score destinations based on various factors
    const scored = destinations.map(dest => {
      let score = 0;
      let reason = '';

      // Base quality score
      score += (dest.rating || 0) * 2;
      score += (dest.michelin_stars || 0) * 5;
      if (dest.crown) score += 3;

      // Category diversity bonus - prefer variety
      const categoryBonus = {
        restaurant: 2,
        bar: 1.5,
        cafe: 1,
        hotel: 0.5,
        attraction: 2,
        museum: 1.5,
        shop: 1,
      }[dest.category] || 1;
      score += categoryBonus;

      // User preference matching
      if (userPrefs) {
        const favoriteCategories = userPrefs.favorite_categories || [];
        if (favoriteCategories.includes(dest.category)) {
          score += 3;
          reason = 'Matches your taste';
        }

        const budgetLevel = userPrefs.budget_level || 'medium';
        if (budgetLevel === 'luxury' && (dest.michelin_stars || dest.crown)) {
          score += 2;
        }
      }

      // Popular destinations get a small boost
      if (dest.rating && dest.rating >= 4.5) {
        score += 1;
        if (!reason) reason = 'Highly rated';
      }

      // Michelin stars = strong recommendation
      if (dest.michelin_stars && dest.michelin_stars >= 1) {
        if (!reason) reason = `${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`;
      }

      // Crown = editor's pick
      if (dest.crown) {
        if (!reason) reason = "Editor's pick";
      }

      // Add some randomness for variety
      score += Math.random() * 1.5;

      return {
        ...dest,
        score,
        reason: reason || undefined,
      };
    });

    // Sort by score and take top results
    const topSuggestions = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...dest }) => dest);

    return NextResponse.json({
      suggestions: topSuggestions,
    });
  } catch (error) {
    console.error('Trip suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
