/**
 * Generate Sitemap Job
 *
 * POST /api/jobs/generate-sitemap
 *
 * Admin endpoint to generate XML sitemap.
 */

import { NextRequest } from 'next/server';
import { withAdminAuth, createSuccessResponse, AdminContext } from '@/lib/errors';
import { writeFile } from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co';

export const POST = withAdminAuth(async (request: NextRequest, { serviceClient }: AdminContext) => {
  const body = await request.json();
  const { dryRun = false } = body;

  // Fetch all destinations with slugs
  const { data: destinations, error } = await serviceClient
    .from('destinations')
    .select('slug, city, updated_at')
    .not('slug', 'is', null);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch destinations');
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
    xml += `    <loc>${BASE_URL}/city/${encodeURIComponent(city)}</loc>\n`;
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

  return createSuccessResponse({
    message: dryRun ? 'Dry run complete' : 'Sitemap generated',
    ...stats,
    url: `${BASE_URL}/sitemap.xml`,
  });
});
