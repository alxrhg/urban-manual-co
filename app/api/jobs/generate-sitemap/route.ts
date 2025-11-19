/**
 * Generate Sitemap Job
 * 
 * POST /api/jobs/generate-sitemap
 * 
 * QStash-compatible endpoint to generate XML sitemap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireQStashSignature } from '@/lib/qstash-middleware';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co';

async function handleGenerateSitemapJob(request: NextRequest, body: any) {
  try {
    const { dryRun = false } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all destinations with slugs
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, city, updated_at')
      .not('slug', 'is', null);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destinations' },
        { status: 500 }
      );
    }

    // Get unique cities
    const cities = [...new Set(destinations?.map(d => d.city).filter(Boolean))];

    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/discover', priority: '0.9', changefreq: 'weekly' },
      { url: '/explore', priority: '0.8', changefreq: 'weekly' },
      { url: '/account', priority: '0.6', changefreq: 'monthly' },
      { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // City pages
    cities.forEach(city => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/destinations/cities/${encodeURIComponent(city)}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
    });

    // Destination pages
    destinations?.forEach(dest => {
      if (dest.slug) {
        xml += '  <url>\n';
        xml += `    <loc>${BASE_URL}/destination/${dest.slug}</loc>\n`;
        if (dest.updated_at) {
          xml += `    <lastmod>${new Date(dest.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
        }
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += '  </url>\n';
      }
    });

    // Close XML
    xml += '</urlset>\n';

    const stats = {
      total: staticPages.length + cities.length + (destinations?.length || 0),
      staticPages: staticPages.length,
      cityPages: cities.length,
      destinationPages: destinations?.length || 0,
    };

    if (!dryRun) {
      // Write sitemap to public directory
      const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
      await writeFile(sitemapPath, xml, 'utf8');
      console.log(`✓ Sitemap generated: ${sitemapPath}`);
    }

    return NextResponse.json({
      message: dryRun ? 'Dry run complete' : 'Sitemap generated',
      ...stats,
      url: `${BASE_URL}/sitemap.xml`,
    });

  } catch (error) {
    console.error('Generate sitemap job error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check if QStash signature verification is enabled
  const qstashEnabled = process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;

  if (qstashEnabled) {
    return requireQStashSignature(request, handleGenerateSitemapJob);
  } else {
    // For local testing, allow without signature
    const body = await request.json();
    return handleGenerateSitemapJob(request, body);
  }
}
