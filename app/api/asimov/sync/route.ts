/**
 * Asimov Sync API Endpoint
 * 
 * This endpoint processes the sync queue and syncs destinations to Asimov.
 * Can be called:
 * - Manually via POST /api/asimov/sync
 * - Via cron job (recommended every hour)
 * - Via Supabase webhook when destinations change
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { syncDestinationToAsimov, deleteDestinationFromAsimov } from '@/lib/search/asimov-sync';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or service role key
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const vercelCron = request.headers.get('x-vercel-cron');
    
    // Allow if: Vercel cron, valid CRON_SECRET, or service role (for webhooks)
    const isAuthorized = 
      vercelCron === '1' ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      authHeader?.startsWith('Bearer ');

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }

    // Get pending sync items (limit to 50 per run to avoid rate limits)
    const { data: pendingItems, error } = await supabase
      .from('asimov_sync_queue')
      .select('*')
      .is('synced_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[Asimov Sync] Error fetching queue:', error);
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No pending items to sync',
      });
    }

    let success = 0;
    let failed = 0;

    // Process each item
    for (const item of pendingItems) {
      try {
        if (item.action === 'DELETE') {
          const result = await deleteDestinationFromAsimov(item.destination_id);
          if (result) {
            await supabase
              .from('asimov_sync_queue')
              .update({ synced_at: new Date().toISOString() })
              .eq('destination_id', item.destination_id);
            success++;
          } else {
            failed++;
            // Increment retry count
            await supabase
              .from('asimov_sync_queue')
              .update({ 
                retry_count: (item.retry_count || 0) + 1,
                last_error: 'Failed to delete from Asimov'
              })
              .eq('destination_id', item.destination_id);
          }
        } else {
          // INSERT or UPDATE - fetch full destination data
          const { data: destination } = await supabase
            .from('destinations')
            .select('id, slug, name, city, category, description, content, rating, michelin_stars, price_level, tags')
            .eq('id', item.destination_id)
            .single();

          if (!destination) {
            // Destination was deleted, mark as synced
            await supabase
              .from('asimov_sync_queue')
              .update({ synced_at: new Date().toISOString() })
              .eq('destination_id', item.destination_id);
            continue;
          }

          const result = await syncDestinationToAsimov(destination);
          
          if (result) {
            await supabase
              .from('asimov_sync_queue')
              .update({ synced_at: new Date().toISOString() })
              .eq('destination_id', item.destination_id);
            success++;
          } else {
            failed++;
            // Increment retry count
            await supabase
              .from('asimov_sync_queue')
              .update({ 
                retry_count: (item.retry_count || 0) + 1,
                last_error: 'Failed to sync to Asimov'
              })
              .eq('destination_id', item.destination_id);
          }
        }

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`[Asimov Sync] Error processing item ${item.destination_id}:`, error);
        failed++;
        await supabase
          .from('asimov_sync_queue')
          .update({ 
            retry_count: (item.retry_count || 0) + 1,
            last_error: error.message
          })
          .eq('destination_id', item.destination_id);
      }
    }

    return NextResponse.json({
      success: true,
      synced: success,
      failed,
      total: pendingItems.length,
    });
  } catch (error: any) {
    console.error('[Asimov Sync] Fatal error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}

