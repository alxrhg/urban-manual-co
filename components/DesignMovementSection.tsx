/**
 * Design Movement Section
 * Showcase design movements on homepage
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Building2, ArrowRight } from 'lucide-react';
import type { DesignMovement } from '@/types/architecture';
import Link from 'next/link';
import { MovementTag } from './MovementTag';

export function DesignMovementSection() {
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
        .order('name')
        .limit(6);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || movements.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-2xl font-bold">Design Movements</h2>
          </div>
          <Link
            href="/movements"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {movements.map((movement) => (
            <Link
              key={movement.id}
              href={`/movement/${movement.slug}`}
              className="group bg-gray-50 dark:bg-gray-800 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold group-hover:opacity-70 transition">
                  {movement.name}
                </h3>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition" />
              </div>
              {movement.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
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

