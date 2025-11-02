import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function POST(request: NextRequest) {
  try {
    // Check admin status
    const authHeader = request.headers.get('x-admin-email');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(authHeader.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    // Get existing destinations to avoid recommending duplicates
    const { data: existingDestinations } = await supabase
      .from('destinations')
      .select('name, city')
      .limit(1000);

    const existingNames = new Set(
      (existingDestinations || []).map(d => `${d.name.toLowerCase()} ${d.city?.toLowerCase()}`)
    );

    // Build prompt for Gemini
    const prompt = `You are a travel expert helping to discover amazing places around the world. 

Generate a list of 5-8 unique, noteworthy destinations that would be great additions to a travel guide. Focus on:
- Famous restaurants, cafes, bars, hotels, museums, galleries, shops, parks, or attractions
- Places that travelers would want to visit
- Mix of different cities and categories
- Places with interesting stories or unique features

For each place, provide:
- Exact name (as it appears in Google Maps)
- City name
- Category (one of: restaurant, cafe, bar, hotel, museum, gallery, shopping, park, attraction, nightlife, activity, or other)
- A brief reason why it's worth visiting (1 sentence)

Respond ONLY with valid JSON in this exact format:
{
  "recommendations": [
    {
      "name": "Place Name",
      "city": "City Name",
      "category": "category",
      "reason": "Why this place is worth visiting"
    }
  ]
}`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in Gemini response:', text);
      return NextResponse.json(
        { error: 'Invalid response format from Gemini' },
        { status: 500 }
      );
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonMatch[0]);
      return NextResponse.json(
        { error: 'Failed to parse Gemini response' },
        { status: 500 }
      );
    }

    // Process recommendations
    const recommendations = (result.recommendations || [])
      .map((rec: any) => {
        // Check if already exists
        const key = `${rec.name?.toLowerCase()} ${rec.city?.toLowerCase()}`;
        if (existingNames.has(key)) {
          return null;
        }

        // Generate slug
        const slug = rec.name
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        return {
          name: rec.name || '',
          city: rec.city || '',
          category: rec.category?.toLowerCase() || 'other',
          slug: slug || '',
          reason: rec.reason || '',
        };
      })
      .filter((r: any) => r !== null)
      .slice(0, 8); // Limit to 8 recommendations

    return NextResponse.json({
      recommendations,
    });

  } catch (error: any) {
    console.error('Gemini place recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get place recommendations' },
      { status: 500 }
    );
  }
}

