'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';

interface ContentManagerProps {
  onEditDestination?: (destination: Destination) => void;
  onCreateNew?: () => void;
}

type SortField = 'name' | 'city' | 'category' | 'updated_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

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

const ITEMS_PER_PAGE = 24;

export function ContentManager({ onEditDestination, onCreateNew }: ContentManagerProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Fetch unique cities
  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase
        .from('destinations')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (data) {
        const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))] as string[];
        setCities(uniqueCities);
      }
    }
    fetchCities();
  }, []);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery) return cities;
    return cities.filter(city =>
      city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );
  }, [cities, citySearchQuery]);

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

      if (selectedCity) {
        query = query.eq('city', selectedCity);
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
  }, [searchQuery, selectedCategory, selectedCity, sortField, sortOrder, page]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedCity]);

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

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedCity('');
    setSearchQuery('');
  };

  const hasActiveFilters = !!(selectedCategory || selectedCity || searchQuery);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Content</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount.toLocaleString()} destinations
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
        >
          Add New
        </button>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 space-y-4">
        {/* Search + View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            )}
          </button>

          <div className="hidden sm:flex items-center border border-gray-200 dark:border-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* City Filter */}
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  selectedCity
                    ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {selectedCity || 'All Cities'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showCityDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCityDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-64 max-h-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                      <input
                        type="text"
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                        placeholder="Search cities..."
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-60">
                      <button
                        onClick={() => {
                          setSelectedCity('');
                          setShowCityDropdown(false);
                          setCitySearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          !selectedCity ? 'text-black dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        All Cities
                      </button>
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            setSelectedCity(city);
                            setShowCityDropdown(false);
                            setCitySearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            selectedCity === city ? 'text-black dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-black dark:focus:border-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Sort:</span>
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="city-asc">City A-Z</option>
                <option value="city-desc">City Z-A</option>
                <option value="category-asc">Category A-Z</option>
                <option value="updated_at-desc">Recently Updated</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItems.size} selected
          </span>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            {bulkActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Delete
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <LoadingState viewMode={viewMode} />
      ) : destinations.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
      ) : viewMode === 'grid' ? (
        <GridView
          destinations={destinations}
          selectedItems={selectedItems}
          toggleSelect={toggleSelect}
          onEdit={onEditDestination}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
        />
      ) : (
        <TableView
          destinations={destinations}
          selectedItems={selectedItems}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          onEdit={onEditDestination}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
          handleSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({
  destinations,
  selectedItems,
  toggleSelect,
  toggleSelectAll,
  onEdit,
  activeDropdown,
  setActiveDropdown,
  handleDelete,
  handleDuplicate,
  handleSort,
  sortField,
  sortOrder,
}: {
  destinations: Destination[];
  selectedItems: Set<number>;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  onEdit?: (destination: Destination) => void;
  activeDropdown: number | null;
  setActiveDropdown: (id: number | null) => void;
  handleDelete: (id: number) => void;
  handleDuplicate: (destination: Destination) => void;
  handleSort: (field: SortField) => void;
  sortField: SortField;
  sortOrder: SortOrder;
}) {
  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium"
    >
      {children}
      {sortField === field && (
        <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      )}
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="w-10 px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedItems.size === destinations.length && destinations.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
              />
            </th>
            <th className="px-3 py-3 text-left">
              <SortButton field="name">Name</SortButton>
            </th>
            <th className="px-3 py-3 text-left hidden md:table-cell">
              <SortButton field="city">City</SortButton>
            </th>
            <th className="px-3 py-3 text-left hidden sm:table-cell">
              <SortButton field="category">Category</SortButton>
            </th>
            <th className="px-3 py-3 text-left hidden lg:table-cell">
              <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Status</span>
            </th>
            <th className="w-10 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {destinations.map((dest) => (
            <tr
              key={dest.id}
              className={`group hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                selectedItems.has(dest.id!) ? 'bg-gray-50 dark:bg-gray-900/30' : ''
              }`}
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(dest.id!)}
                  onChange={() => toggleSelect(dest.id!)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
              </td>
              <td className="px-3 py-3">
                <button
                  onClick={() => onEdit?.(dest)}
                  className="flex items-center gap-3 text-left hover:opacity-70 transition-opacity"
                >
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-black dark:text-white truncate">{dest.name}</span>
                      {dest.crown && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      {dest.michelin_stars && dest.michelin_stars > 0 && (
                        <div className="flex">
                          {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-red-500 fill-red-500" />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 truncate block">{dest.slug}</span>
                  </div>
                </button>
              </td>
              <td className="px-3 py-3 hidden md:table-cell">
                <span className="text-sm text-gray-600 dark:text-gray-400">{dest.city}</span>
              </td>
              <td className="px-3 py-3 hidden sm:table-cell">
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{dest.category}</span>
              </td>
              <td className="px-3 py-3 hidden lg:table-cell">
                <div className="flex items-center gap-1.5">
                  {dest.last_enriched_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Enriched
                    </span>
                  )}
                  {dest.image && (
                    <span className="inline-flex text-[10px] text-blue-600 dark:text-blue-400">
                      <ImageIcon className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <RowActions
                  destination={dest}
                  isActive={activeDropdown === dest.id}
                  onToggle={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
                  onClose={() => setActiveDropdown(null)}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Grid View Component
function GridView({
  destinations,
  selectedItems,
  toggleSelect,
  onEdit,
  activeDropdown,
  setActiveDropdown,
  handleDelete,
  handleDuplicate,
}: {
  destinations: Destination[];
  selectedItems: Set<number>;
  toggleSelect: (id: number) => void;
  onEdit?: (destination: Destination) => void;
  activeDropdown: number | null;
  setActiveDropdown: (id: number | null) => void;
  handleDelete: (id: number) => void;
  handleDuplicate: (destination: Destination) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {destinations.map((dest) => (
        <div
          key={dest.id}
          className={`group relative rounded-2xl overflow-hidden border transition-colors ${
            selectedItems.has(dest.id!)
              ? 'border-black dark:border-white'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          {/* Checkbox */}
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selectedItems.has(dest.id!)}
              onChange={() => toggleSelect(dest.id!)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/90"
            />
          </div>

          {/* Actions */}
          <div className="absolute top-2 right-2 z-10">
            <RowActions
              destination={dest}
              isActive={activeDropdown === dest.id}
              onToggle={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
              onClose={() => setActiveDropdown(null)}
              onEdit={onEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              compact
            />
          </div>

          {/* Image */}
          <button
            onClick={() => onEdit?.(dest)}
            className="w-full text-left"
          >
            <div className="aspect-square bg-gray-100 dark:bg-gray-800">
              {dest.image ? (
                <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-black dark:text-white truncate">{dest.name}</p>
                {dest.crown && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Globe className="w-3 h-3" />
                <span className="truncate">{dest.city}</span>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

// Row Actions Dropdown
function RowActions({
  destination,
  isActive,
  onToggle,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}: {
  destination: Destination;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit?: (destination: Destination) => void;
  onDelete: (id: number) => void;
  onDuplicate: (destination: Destination) => void;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-colors ${
          compact
            ? 'bg-white/90 dark:bg-gray-900/90 shadow-sm hover:bg-white dark:hover:bg-gray-900'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isActive && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
            <button
              onClick={() => {
                onEdit?.(destination);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <a
              href={`/destinations/${destination.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={onClose}
            >
              <ExternalLink className="w-4 h-4" />
              View
            </a>
            <button
              onClick={() => onDuplicate(destination)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
            <button
              onClick={() => onDelete(destination.id!)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Loading State
function LoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-2">No destinations found</p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="text-sm text-gray-500 hover:text-black dark:hover:text-white underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
