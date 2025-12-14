import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, createSuccessResponse, AuthContext } from '@/lib/errors';

/**
 * GET /api/account/preferences
 * Fetch user's taste profile/preferences
 */
export const GET = withAuth(async (_request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('favorite_cities, favorite_categories, travel_style, interests, dietary_preferences, price_preference')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Preferences] Error fetching:', error);
    throw error;
  }

  return createSuccessResponse({
    preferences: {
      favoriteCities: profile?.favorite_cities || [],
      favoriteCategories: profile?.favorite_categories || [],
      travelStyle: profile?.travel_style || null,
      interests: profile?.interests || [],
      dietaryPreferences: profile?.dietary_preferences || [],
      pricePreference: profile?.price_preference || null,
    },
  });
});

/**
 * POST /api/account/preferences
 * Update user's taste profile/preferences
 */
export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const body = await request.json();
  const {
    favoriteCities,
    favoriteCategories,
    travelStyle,
    interests,
    dietaryPreferences,
    pricePreference,
  } = body;

  // Update or insert profile
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      favorite_cities: favoriteCities || [],
      favorite_categories: favoriteCategories || [],
      travel_style: travelStyle || null,
      interests: interests || [],
      dietary_preferences: dietaryPreferences || [],
      price_preference: pricePreference || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[Preferences] Error updating:', error);
    throw error;
  }

  return createSuccessResponse({ success: true, preferences: data });
});
