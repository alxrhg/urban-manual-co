/**
 * All Movements Page
 * Browse all design movements
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Building2 } from 'lucide-react';
import type { DesignMovement } from '@/types/architecture';
import Link from 'next/link';

export default function MovementsPage() {
  const [movements, setMovements] = useState<DesignMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('design_movements')
        .select('*')
        .order('name');

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Design Movements</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore architectural movements that have shaped our built environment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {movements.map((movement) => (
            <Link
              key={movement.id}
              href={`/movement/${movement.slug}`}
              className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold mb-2 group-hover:opacity-70 transition">
                {movement.name}
              </h2>
              {movement.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {movement.description}
                </p>
              )}
              {movement.period_start && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {movement.period_start}
                  {movement.period_end ? ` - ${movement.period_end}` : ' - Present'}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

