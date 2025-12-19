'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Settings,
  Loader2,
  Check,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Skeleton } from '@/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { DestinationDetailPanel } from './DestinationDetailPanel';

interface CMSPanelLayoutProps {
  onSaveDestination: (data: Partial<Destination>) => Promise<void>;
  isSaving: boolean;
}

const ITEMS_PER_PAGE = 50;

export function CMSPanelLayout({ onSaveDestination, isSaving }: CMSPanelLayoutProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        const escaped = searchQuery.trim().replace(/[%_]/g, '\\$&');
        query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setDestinations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === destinations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(destinations.map(d => d.id!)));
    }
  };

  const handleRowClick = (dest: Destination) => {
    setSelectedDestination(dest);
  };

  const handleCreateNew = () => {
    setSelectedDestination({} as Destination);
  };

  const handleClosePanel = () => {
    setSelectedDestination(null);
  };

  const handleSave = async (data: Partial<Destination>) => {
    await onSaveDestination(data);
    fetchDestinations();
  };

  const navigateToItem = (direction: 'prev' | 'next') => {
    if (!selectedDestination) return;
    const currentIndex = destinations.findIndex(d => d.id === selectedDestination.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < destinations.length) {
      setSelectedDestination(destinations[newIndex]);
    }
  };

  const currentIndex = selectedDestination?.id
    ? destinations.findIndex(d => d.id === selectedDestination.id)
    : -1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < destinations.length - 1 && currentIndex !== -1;

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      if (selectedDestination?.id === id) {
        setSelectedDestination(null);
      }
      fetchDestinations();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete');
    }
  };

  const handleDuplicate = async (dest: Destination) => {
    try {
      const { id, ...rest } = dest;
      const { error } = await supabase.from('destinations').insert({
        ...rest,
        name: `${dest.name} (Copy)`,
        slug: `${dest.slug}-copy-${Date.now()}`,
      });
      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate');
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Left Panel - Table */}
      <div className={`flex flex-col ${selectedDestination ? 'w-1/2 border-r border-gray-200 dark:border-gray-800' : 'w-full'} transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Destinations</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateNew} size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              New item
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <TableSkeleton />
          ) : destinations.length === 0 ? (
            <EmptyState onCreateNew={handleCreateNew} />
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <Checkbox
                      checked={selectedItems.size === destinations.length && destinations.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    Slug
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    City
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    Category
                  </th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {destinations.map((dest) => (
                  <tr
                    key={dest.id}
                    onClick={() => handleRowClick(dest)}
                    className={`cursor-pointer transition-colors ${
                      selectedDestination?.id === dest.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(dest.id!)}
                        onCheckedChange={() => toggleSelect(dest.id!)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate block max-w-[200px]">
                        {dest.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-gray-500 dark:text-gray-400 text-xs truncate block max-w-[150px]">
                        /{dest.slug}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <span className="text-gray-600 dark:text-gray-400">{dest.city}</span>
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell">
                      <span className="text-gray-500 dark:text-gray-400 capitalize text-xs">
                        {dest.category}
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        destination={dest}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with pagination */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </div>
        )}
      </div>

      {/* Right Panel - Detail */}
      {selectedDestination && (
        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-950">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateToItem('prev')}
                disabled={!canNavigatePrev}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateToItem('next')}
                disabled={!canNavigateNext}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClosePanel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Detail Panel Content */}
          <div className="flex-1 overflow-hidden">
            <DestinationDetailPanel
              destination={selectedDestination.id ? selectedDestination : undefined}
              onSave={handleSave}
              onClose={handleClosePanel}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RowActions({
  destination,
  onDelete,
  onDuplicate,
}: {
  destination: Destination;
  onDelete: (id: number) => void;
  onDuplicate: (dest: Destination) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <a
            href={`/destinations/${destination.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(destination)}>
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(destination.id!)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 hidden md:block" />
          <Skeleton className="h-4 w-20 hidden lg:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-gray-500 dark:text-gray-400 mb-4">No destinations found</p>
      <Button onClick={onCreateNew} size="sm">
        <Plus className="w-4 h-4 mr-1" />
        Add first destination
      </Button>
    </div>
  );
}
