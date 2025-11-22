import { NextRequest, NextResponse } from 'next/server';
import { getMapPins } from '@/server/services/homepage-loaders';

export async function GET(_request: NextRequest) {
    try {
        console.log('[Map Pins API] Fetching pins...');
        const pins = await getMapPins();
        console.log(`[Map Pins API] Fetched ${pins.length} pins`);
        return NextResponse.json({ success: true, pins });
    } catch (error: any) {
        console.error('[Map Pins API] Error loading pins:', error?.message || error);

        // Check if it's a Supabase config error or connection issue
        if (error?.message?.includes('placeholder') ||
            error?.message?.includes('invalid') ||
            error?.message?.includes('Failed to create service role client') ||
            error?.code === 'ECONNREFUSED' ||
            error?.code === 'ETIMEDOUT') {
            console.warn('[Map Pins API] Database connection issue - returning empty pins');
            return NextResponse.json({ success: true, pins: [], note: 'Database temporarily unavailable' }, { status: 200 });
        }

        // For other errors, also return empty pins with 200 for better UX
        return NextResponse.json({ success: true, pins: [], error: 'Unable to load map pins' }, { status: 200 });
    }
}

// Disable caching completely to ensure new POIs show up immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;
