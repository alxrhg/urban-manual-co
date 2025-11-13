'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const Pill = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em]',
      {
        neutral: 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300',
        accent: 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black',
        success: 'border-emerald-200 text-emerald-700 dark:border-emerald-500 dark:text-emerald-200',
        warning: 'border-amber-200 text-amber-700 dark:border-amber-500 dark:text-amber-200',
      }[tone]
    )}
  >
    {children}
  </span>
);

export type Destination = {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string;
  content?: string;
  image?: string;
  google_place_id?: string;
  formatted_address?: string;
  rating?: number;
  michelin_stars?: number;
  crown?: boolean;
  parent_destination_id?: number | null;
};

export const createColumns = (
  onEdit: (destination: Destination) => void,
  onDelete: (slug: string, name: string) => void
): ColumnDef<Destination>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const destination = row.original;
      return (
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {destination.name}
          </span>
          <div className="flex flex-wrap gap-2">
            {destination.crown && <Pill tone="accent">Crown</Pill>}
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <Pill tone="success">⭐ {destination.michelin_stars}</Pill>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'city',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          City
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-xs text-gray-500">{row.getValue('city')}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {String(row.getValue('category') || '').replace(/_/g, ' ')}
      </div>
    ),
  },
  {
    accessorKey: 'google_place_id',
    header: 'Status',
    cell: ({ row }) => {
      const isEnriched = !!row.original.google_place_id;
      return (
        <Pill tone={isEnriched ? 'success' : 'warning'}>
          {isEnriched ? 'Enriched' : 'Draft'}
        </Pill>
      );
    },
  },
  {
    accessorKey: 'formatted_address',
    header: 'Address',
    cell: ({ row }) => {
      const hasAddress = !!row.original.formatted_address;
      return hasAddress ? (
        <span className="text-xs text-green-600 dark:text-green-400">✓</span>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      );
    },
  },
  {
    accessorKey: 'rating',
    header: () => <div className="text-right">Rating</div>,
    cell: ({ row }) => {
      const rating = row.original.rating;
      return rating ? (
        <div className="text-right text-xs text-green-600 dark:text-green-400">
          ⭐ {rating.toFixed(1)}
        </div>
      ) : (
        <div className="text-right text-xs text-gray-400">—</div>
      );
    },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] tracking-[0.2em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {row.getValue('slug')}
      </code>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const destination = row.original;

      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onEdit(destination)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
          >
            <Edit className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete(destination.slug, destination.name)}
            className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 dark:border-rose-500/80 dark:text-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      );
    },
  },
];

