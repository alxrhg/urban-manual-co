'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Star,
  Crown,
  Globe,
  Image as ImageIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';

interface ContentManagerProps {
  onEditDestination?: (destination: Destination) => void;
  onCreateNew?: () => void;
}

type SortField = 'name' | 'city' | 'category';
type SortOrder = 'asc' | 'desc';

const CATEGORIES = [
  'restaurant',
  'hotel',
  'bar',
  'cafe',
  'gallery',
  'museum',
  'shop',
  'landmark',
  'park',
  'beach',
  'market',
  'spa',
  'club',
];

const ITEMS_PER_PAGE = 20;

export function ContentManager({ onEditDestination, onCreateNew }: ContentManagerProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setDestinations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sortField, sortOrder, page]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === destinations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(destinations.map(d => d.id!)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} destinations? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete destinations');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this destination? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete destination');
    }
    setActiveDropdown(null);
  };

  const handleDuplicate = async (destination: Destination) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = destination;
      const { error } = await supabase.from('destinations').insert({
        ...rest,
        name: `${destination.name} (Copy)`,
        slug: `${destination.slug}-copy-${Date.now()}`,
      });
      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate destination');
    }
    setActiveDropdown(null);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Destinations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount.toLocaleString()} total destinations
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-100"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:inline">Add Destination</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destinations..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="capitalize">
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {selectedItems.size} selected
          </span>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {bulkActionLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Delete
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : destinations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No destinations found
          </div>
        ) : (
          destinations.map((dest) => (
            <div
              key={dest.id}
              className={`p-4 bg-white dark:bg-gray-900 border rounded-xl transition-colors ${
                selectedItems.has(dest.id!)
                  ? 'border-gray-900 dark:border-white'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(dest.id!)}
                  onChange={() => toggleSelect(dest.id!)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                  {dest.image ? (
                    <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                    {dest.crown && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {dest.michelin_stars && dest.michelin_stars > 0 && (
                      <Star className="w-3.5 h-3.5 text-red-500 fill-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{dest.city}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded capitalize">
                      {dest.category}
                    </span>
                    {dest.last_enriched_at && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Enriched
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onEditDestination?.(dest)}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === destinations.length && destinations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                  >
                    Destination
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('city')}
                    className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                  >
                    Location
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('category')}
                    className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                  >
                    Category
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Status</span>
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : destinations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No destinations found
                  </td>
                </tr>
              ) : (
                destinations.map((dest) => (
                  <tr
                    key={dest.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                      selectedItems.has(dest.id!) ? 'bg-gray-50 dark:bg-gray-900/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(dest.id!)}
                        onChange={() => toggleSelect(dest.id!)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          {dest.image ? (
                            <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                            {dest.crown && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                            {dest.michelin_stars && dest.michelin_stars > 0 && (
                              <span className="flex items-center">
                                {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3 text-red-500 fill-red-500" />
                                ))}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{dest.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{dest.city}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                        {dest.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {dest.last_enriched_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            Enriched
                          </span>
                        )}
                        {dest.image && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                            <ImageIcon className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdown === dest.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-20 py-1 overflow-hidden">
                              <button
                                onClick={() => {
                                  onEditDestination?.(dest);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <a
                                href={`/destinations/${dest.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Live
                              </a>
                              <button
                                onClick={() => handleDuplicate(dest)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
                              <button
                                onClick={() => handleDelete(dest.id!)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="flex sm:hidden items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
