'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  Copy,
  Star,
  Crown,
  Globe,
  Image as ImageIcon,
  Calendar,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';

interface ContentManagerProps {
  onEditDestination?: (destination: Destination) => void;
  onCreateNew?: () => void;
}

type SortField = 'name' | 'city' | 'category' | 'updated_at' | 'views_count';
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
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Apply pagination
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
      setSortOrder('desc');
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
      const { id, created_at, updated_at, ...rest } = destination;
      const { error } = await supabase.from('destinations').insert({
        ...rest,
        name: `${rest.name} (Copy)`,
        slug: `${rest.slug}-copy-${Date.now()}`,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Content Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage all {totalCount.toLocaleString()} destinations
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Destination
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destinations..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-2.5 rounded-lg border transition-colors
              ${showFilters
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}
            `}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <span className="text-sm text-indigo-300">
            {selectedItems.size} selected
          </span>
          <div className="h-4 w-px bg-indigo-500/30" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === destinations.length && destinations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 font-medium"
                  >
                    Destination
                    {sortField === 'name' && (
                      sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('city')}
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 font-medium"
                  >
                    Location
                    {sortField === 'city' && (
                      sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 font-medium"
                  >
                    Category
                    {sortField === 'category' && (
                      sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Status</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('updated_at')}
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 font-medium"
                  >
                    Updated
                    {sortField === 'updated_at' && (
                      sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : destinations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No destinations found
                  </td>
                </tr>
              ) : (
                destinations.map((dest) => (
                  <tr
                    key={dest.id}
                    className={`
                      hover:bg-gray-900/50 transition-colors
                      ${selectedItems.has(dest.id!) ? 'bg-indigo-500/5' : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(dest.id!)}
                        onChange={() => toggleSelect(dest.id!)}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                          {dest.image ? (
                            <img
                              src={dest.image}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {dest.name}
                            </p>
                            {dest.crown && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            {dest.michelin_stars && dest.michelin_stars > 0 && (
                              <span className="flex items-center gap-0.5">
                                {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3 text-red-500 fill-red-500" />
                                ))}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{dest.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-sm text-gray-300">{dest.city}</span>
                        {dest.country && (
                          <span className="text-xs text-gray-500">, {dest.country}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 capitalize">
                        {dest.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {dest.google_place_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                            <Check className="w-3 h-3" />
                            Enriched
                          </span>
                        )}
                        {dest.image && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400">
                            <ImageIcon className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {dest.updated_at
                          ? new Date(dest.updated_at).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdown === dest.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveDropdown(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-gray-900 border border-gray-800 shadow-xl z-20 py-1 overflow-hidden">
                              <button
                                onClick={() => {
                                  onEditDestination?.(dest);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <a
                                href={`/destinations/${dest.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Live
                              </a>
                              <button
                                onClick={() => handleDuplicate(dest)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <div className="my-1 border-t border-gray-800" />
                              <button
                                onClick={() => handleDelete(dest.id!)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`
                      w-8 h-8 rounded-lg text-sm font-medium transition-colors
                      ${page === pageNum
                        ? 'bg-indigo-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
