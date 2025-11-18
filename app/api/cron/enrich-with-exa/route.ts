import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron jobs will have a time limit (10s on Hobby, 60s on Pro)
// We need to be careful not to timeout. We'll process a small batch.
const BATCH_SIZE = 5;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EXA_API_KEY = process.env.EXA_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Search Exa for architect/design information
 */
async function searchExaForArchitectInfo(name: string, city: string) {
  if (!EXA_API_KEY) return {};

  try {
    const query = `${name} architect interior design ${city}`;
    
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify({
        query,
        num_results: 5,
        use_autoprompt: true,
        contents: { text: true, highlights: true },
        category: 'architecture,design,interior',
      }),
    });

    if (!response.ok) throw new Error(`Exa API error: ${response.statusText}`);
    const data = await response.json();
    return extractArchitectInfo(data.results || []);
  } catch (error) {
    console.error('Exa search error:', error);
    return {};
  }
}

/**
 * Extract architect/design information from results
 */
function extractArchitectInfo(results: any[]) {
  const extracted: any = {};
  const combinedText = results.map(r => (r.text || r.title || '')).join(' ');
  const lowerText = combinedText.toLowerCase();

  // Basic extraction patterns (simplified from CLI script for brevity)
  const patterns = {
    architect: /(?:designed|design) by ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    firm: /(?:by|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:studio|firm|architects)/i,
    style: /(modernist|brutalist|contemporary|minimalist|art deco|bauhaus)/i,
    period: /(19\d{2}s|20\d{2}s)/i,
  };

  const archMatch = combinedText.match(patterns.architect);
  if (archMatch?.[1]) extracted.architect = archMatch[1].trim();

  const firmMatch = combinedText.match(patterns.firm);
  if (firmMatch?.[1]) extracted.designFirm = firmMatch[1].trim();

  const styleMatch = lowerText.match(patterns.style);
  if (styleMatch?.[1]) extracted.architecturalStyle = styleMatch[1].trim();

  const periodMatch = lowerText.match(patterns.period);
  if (periodMatch?.[1]) extracted.designPeriod = periodMatch[1].trim();

  return extracted;
}

export async function GET(req: NextRequest) {
  // Security check for Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow local testing if no secret set, otherwise 401
    if (process.env.NODE_ENV !== 'development' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!EXA_API_KEY) {
    return NextResponse.json({ error: 'Missing EXA_API_KEY' }, { status: 500 });
  }

  try {
    // 1. Find destinations needing enrichment
    // Prioritize those without architect info
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, name, city, category')
      .is('parent_destination_id', null)
      .is('architect', null)
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!destinations?.length) {
      return NextResponse.json({ message: 'No destinations to enrich' });
    }

    const results = [];

    // 2. Enrich each destination
    for (const dest of destinations) {
      const info = await searchExaForArchitectInfo(dest.name, dest.city);
      
      const updateData: any = {};
      if (info.architect) updateData.architect = info.architect;
      if (info.architecturalStyle) updateData.architectural_style = info.architecturalStyle;
      // Map other fields if columns exist (design_firm, design_period from migration 027)
      if (info.designFirm) updateData.design_firm = info.designFirm;
      if (info.designPeriod) updateData.design_period = info.designPeriod;

      // Only update if we found new info
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('destinations')
          .update(updateData)
          .eq('slug', dest.slug);
        
        results.push({ slug: dest.slug, found: Object.keys(updateData) });
      } else {
        // Mark as processed so we don't retry immediately? 
        // For now, we'll just rely on 'architect is null' check. 
        // Ideally, we'd have a 'last_enriched_at' field.
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: destinations.length,
      enriched: results 
    });

  } catch (error: any) {
    console.error('Enrichment cron failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
