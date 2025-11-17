/**
 * Supabase Edge Function: Sync Destination to Asimov
 * 
 * This function is called when a destination is created or updated
 * It syncs the destination data to Asimov for indexing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASIMOV_API_KEY = Deno.env.get('ASIMOV_API_KEY');
const ASIMOV_API_URL = 'https://asimov.mov/api';

serve(async (req) => {
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { destination_id, action } = await req.json();

    if (!destination_id) {
      return new Response(
        JSON.stringify({ error: 'destination_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destination_id)
      .single();

    if (error || !destination) {
      return new Response(
        JSON.stringify({ error: 'Destination not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build content for Asimov
    const contentParts = [
      destination.name,
      destination.description,
      destination.content,
      destination.city,
      destination.category,
      destination.country,
      destination.neighborhood,
      destination.architect,
      destination.brand,
      ...(destination.tags || []),
      ...(destination.ai_keywords || []),
      ...(destination.ai_vibe_tags || []),
      destination.ai_short_summary,
      destination.editorial_summary,
    ].filter(Boolean);

    const asimovContent = {
      title: destination.name,
      content: contentParts.join(' '),
      metadata: {
        id: destination.id,
        slug: destination.slug,
        city: destination.city,
        category: destination.category,
        country: destination.country,
        rating: destination.rating,
        michelin_stars: destination.michelin_stars,
        price_level: destination.price_level,
        neighborhood: destination.neighborhood,
        tags: destination.tags || [],
      },
      url: `https://urbanmanual.co/destination/${destination.slug}`,
    };

    // Sync to Asimov
    if (ASIMOV_API_KEY) {
      const response = await fetch(`${ASIMOV_API_URL}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ASIMOV_API_KEY}`,
        },
        body: JSON.stringify(asimovContent),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ 
            error: 'Asimov sync failed',
            details: error,
            destination_id 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        destination_id,
        action,
        synced_to_asimov: !!ASIMOV_API_KEY
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

