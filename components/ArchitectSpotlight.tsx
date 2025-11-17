/**
 * Architect Spotlight
 * Featured architect hero section for homepage
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, ArrowRight } from 'lucide-react';
import type { Architect } from '@/types/architecture';
import Link from 'next/link';

export function ArchitectSpotlight() {
  const [architect, setArchitect] = useState<Architect | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArchitect();
  }, []);

  const fetchFeaturedArchitect = async () => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Get a random architect with destinations
      const { data: architects, error } = await supabaseClient
        .from('architects')
        .select('*')
        .limit(10);

      if (error || !architects || architects.length === 0) {
        setLoading(false);
        return;
      }

      // Pick a random architect
      const randomArchitect = architects[Math.floor(Math.random() * architects.length)];
      setArchitect(randomArchitect);
    } catch (error) {
      console.error('Error fetching featured architect:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !architect) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Featured Architect
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              {architect.name}
            </h2>
            {architect.bio && (
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                {architect.bio}
              </p>
            )}
            {architect.design_philosophy && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                "{architect.design_philosophy}"
              </p>
            )}
            <Link
              href={`/architect/${architect.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:opacity-70 transition"
            >
              Explore Works
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {architect.image_url && (
            <div className="w-full md:w-64 h-64 md:h-48 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img
                src={architect.image_url}
                alt={architect.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

