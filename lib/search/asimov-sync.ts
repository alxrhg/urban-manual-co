/**
 * Asimov Sync - Sync Urban Manual destinations to Asimov
 * 
 * This allows Asimov to search through your destination data.
 * When you add/update destinations in Supabase, sync them to Asimov.
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

interface AsimovContentItem {
  id?: string;
  title: string;
  content: string;
  url?: string;
  metadata?: {
    slug?: string;
    city?: string;
    category?: string;
    rating?: number;
    michelin_stars?: number;
    price_level?: number;
    tags?: string[];
  };
}

/**
 * Add or update a destination in Asimov
 */
export async function syncDestinationToAsimov(destination: {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string;
  content?: string;
  rating?: number;
  michelin_stars?: number;
  price_level?: number;
  tags?: string[];
}): Promise<boolean> {
  const apiKey = process.env.ASIMOV_API_KEY;
  
  if (!apiKey) {
    console.log('[Asimov Sync] API key not configured, skipping sync');
    return false;
  }

  try {
    // Build content for Asimov
    const content = [
      destination.name,
      destination.description || '',
      destination.content || '',
      destination.city,
      destination.category,
      destination.tags?.join(' ') || '',
    ].filter(Boolean).join(' ');

    const item: AsimovContentItem = {
      id: `destination-${destination.id}`,
      title: destination.name,
      content: content.substring(0, 10000), // Asimov has token limits
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://urbanmanual.com'}/destination/${destination.slug}`,
      metadata: {
        slug: destination.slug,
        city: destination.city,
        category: destination.category,
        rating: destination.rating,
        michelin_stars: destination.michelin_stars,
        price_level: destination.price_level,
        tags: destination.tags || [],
      },
    };

    // Asimov API endpoint for adding content
    // Note: Check Asimov docs for exact endpoint - this is a placeholder
    const response = await fetch('https://asimov.mov/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        items: [item],
      }),
    });

    if (!response.ok) {
      console.error('[Asimov Sync] Failed to sync destination:', response.status, response.statusText);
      return false;
    }

    console.log('[Asimov Sync] Successfully synced destination:', destination.slug);
    return true;
  } catch (error) {
    console.error('[Asimov Sync] Error syncing destination:', error);
    return false;
  }
}

/**
 * Sync all destinations to Asimov (for initial setup)
 */
export async function syncAllDestinationsToAsimov(): Promise<{ success: number; failed: number }> {
  const supabase = createServiceRoleClient();
  
  if (!supabase) {
    console.error('[Asimov Sync] Supabase client not available');
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  let offset = 0;
  const batchSize = 100;

  try {
    while (true) {
      const { data: destinations, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, description, content, rating, michelin_stars, price_level, tags')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('[Asimov Sync] Error fetching destinations:', error);
        break;
      }

      if (!destinations || destinations.length === 0) {
        break;
      }

      // Sync each destination
      for (const dest of destinations) {
        const result = await syncDestinationToAsimov(dest);
        if (result) {
          success++;
        } else {
          failed++;
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      offset += batchSize;
      
      console.log(`[Asimov Sync] Progress: ${offset} destinations processed (${success} success, ${failed} failed)`);
    }

    console.log(`[Asimov Sync] Complete: ${success} synced, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('[Asimov Sync] Fatal error:', error);
    return { success, failed };
  }
}

/**
 * Delete a destination from Asimov
 */
export async function deleteDestinationFromAsimov(destinationId: number): Promise<boolean> {
  const apiKey = process.env.ASIMOV_API_KEY;
  
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch(`https://asimov.mov/api/content/${destinationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[Asimov Sync] Error deleting destination:', error);
    return false;
  }
}

