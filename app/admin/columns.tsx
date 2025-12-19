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
  onDelete: (slug: string, name: string) => void
): ColumnDef<Destination>[] => [
  {
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
  },
  {
    accessorKey: 'category',
    header: 'Status',
    cell: ({ row }) => {
      const category = row.getValue('category') as string;
      return <div className="capitalize">{category}</div>;
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const destination = row.original;
      return (
        <div className="flex items-center gap-2">
          <span>{destination.name}</span>
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
  },
  {
    accessorKey: 'rating',
    header: () => <div className="text-right">Rating</div>,
    cell: ({ row }) => {
      const rating = row.original.rating;
      if (!rating) return <div className="text-right">-</div>;

      const formatted = rating.toFixed(1);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    enableHiding: false,
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
              onClick={() => navigator.clipboard.writeText(destination.slug)}
            >
              Copy slug
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(destination)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
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
  },
];
