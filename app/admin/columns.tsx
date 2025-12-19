'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Badge } from '@/ui/badge';
import { Checkbox } from '@/ui/checkbox';
import { DataTableColumnHeader } from '@/ui/data-table-column-header';

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
  onDelete: (slug: string, name: string) => void,
  enableRowSelection = false
): ColumnDef<Destination>[] => {
  const columns: ColumnDef<Destination>[] = [];

  // Add select column if row selection is enabled
  if (enableRowSelection) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Add remaining columns
  columns.push(
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const destination = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{destination.name}</span>
            {destination.crown && (
              <Badge variant="default" className="text-xs">Crown</Badge>
            )}
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <Badge variant="outline" className="text-xs">
                {destination.michelin_stars} star{destination.michelin_stars > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'city',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="City" />
      ),
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">{row.getValue('city')}</div>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => (
        <div className="text-sm capitalize">{row.getValue('category')}</div>
      ),
    },
    {
      accessorKey: 'google_place_id',
      header: 'Status',
      cell: ({ row }) => {
        const isEnriched = !!row.original.google_place_id;
        return (
          <Badge variant={isEnriched ? 'default' : 'secondary'} className="text-xs">
            {isEnriched ? 'Enriched' : 'Not Enriched'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'formatted_address',
      header: 'Address',
      cell: ({ row }) => {
        const hasAddress = !!row.original.formatted_address;
        return hasAddress ? (
          <span className="text-sm text-green-600 dark:text-green-400">Yes</span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: 'rating',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rating" className="justify-end" />
      ),
      cell: ({ row }) => {
        const rating = row.original.rating;
        return rating ? (
          <div className="text-right text-sm text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
            <img src="/google-logo.svg" alt="Google" className="h-3 w-3" />
            {rating.toFixed(1)}
          </div>
        ) : (
          <div className="text-right text-sm text-gray-400">-</div>
        );
      },
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          {row.getValue('slug')}
        </code>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const destination = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onEdit(destination)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(destination.slug, destination.name)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  );

  return columns;
};
