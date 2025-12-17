import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Atom Feed Route
 *
 * Generates an Atom 1.0 feed for content syndication.
 * Alternative to RSS 2.0 for feed readers.
 */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data: destinations } = await supabase
      .from('destinations')
      .select('slug, name, city, country, category, micro_description, image, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const latestUpdate = destinations?.[0]?.updated_at || destinations?.[0]?.created_at || new Date().toISOString();

    const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The Urban Manual</title>
  <subtitle>Curated guide to the world's best hotels, restaurants &amp; travel destinations</subtitle>
  <link href="https://www.urbanmanual.co/feed.atom" rel="self" type="application/atom+xml"/>
  <link href="https://www.urbanmanual.co" rel="alternate" type="text/html"/>
  <id>https://www.urbanmanual.co/</id>
  <updated>${formatDate(latestUpdate)}</updated>
  <author>
    <name>The Urban Manual</name>
    <uri>https://www.urbanmanual.co</uri>
  </author>
  <rights>Copyright ${new Date().getFullYear()} The Urban Manual</rights>
  <generator uri="https://www.urbanmanual.co">The Urban Manual</generator>
  <icon>https://www.urbanmanual.co/favicon.ico</icon>
  <logo>https://www.urbanmanual.co/logo.png</logo>
${destinations?.map(dest => {
  const cityFormatted = dest.city
    ?.split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || '';

  return `  <entry>
    <title>${escapeXml(dest.name)}</title>
    <link href="https://www.urbanmanual.co/destination/${dest.slug}" rel="alternate" type="text/html"/>
    <id>https://www.urbanmanual.co/destination/${dest.slug}</id>
    <published>${formatDate(dest.created_at)}</published>
    <updated>${formatDate(dest.updated_at || dest.created_at)}</updated>
    <summary type="text">${escapeXml(dest.micro_description || `${dest.category} in ${cityFormatted}`)}</summary>
    <category term="${escapeXml(dest.category || 'destination')}" label="${escapeXml(dest.category || 'Destination')}"/>
    <content type="html">&lt;p&gt;${escapeXml(dest.micro_description || `Discover ${dest.name}, a curated ${dest.category} in ${cityFormatted}${dest.country ? `, ${dest.country}` : ''}.`)}&lt;/p&gt;${dest.image ? `&lt;img src="${escapeXml(dest.image)}" alt="${escapeXml(dest.name)}" /&gt;` : ''}</content>
  </entry>`;
}).join('\n') || ''}
</feed>`;

    return new NextResponse(atom, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating Atom feed:', error);
    return NextResponse.json({ error: 'Failed to generate feed' }, { status: 500 });
  }
}
