import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/categories
 *
 * Returns all unique categories from the destinations table
 * Useful for debugging category filter issues
 */
export async function GET(request: NextRequest) {
  try {
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('category');

    if (error) throw error;

    // Get unique categories and count
    const categoryMap = new Map<string, number>();

    destinations?.forEach((dest: any) => {
      if (dest.category) {
        const cat = dest.category.trim();
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
    });

    // Convert to array and sort by count
    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      categories,
      total: categories.length,
    });

  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', message: error.message },
      { status: 500 }
    );
  }
}
