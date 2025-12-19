'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Crown,
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
  Download,
  Sparkles,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { Skeleton } from '@/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group';

interface ContentManagerProps {
  onEditDestination?: (destination: Destination) => void;
  onCreateNew?: () => void;
}

type SortField = 'name' | 'city' | 'category' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';
type EnrichedFilter = 'all' | 'enriched' | 'not_enriched';
type MissingDataFilter = 'all' | 'no_image' | 'no_description' | 'no_content';

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

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_ITEMS_PER_PAGE = 24;

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
  // New filter states
  const [enrichedFilter, setEnrichedFilter] = useState<EnrichedFilter>('all');
  const [crownOnly, setCrownOnly] = useState(false);
  const [michelinOnly, setMichelinOnly] = useState(false);
  const [missingDataFilter, setMissingDataFilter] = useState<MissingDataFilter>('all');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  // Bulk action states
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');

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

      // Text search with proper escaping
      if (searchQuery && searchQuery.trim()) {
        const escaped = searchQuery.trim().replace(/[%_]/g, '\\$&');
        query = query.or(`name.ilike.%${escaped}%,city.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
      }

      // Category filter
      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // City filter
      if (selectedCity && selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }

      // Enrichment status filter
      if (enrichedFilter === 'enriched') {
        query = query.not('last_enriched_at', 'is', null);
      } else if (enrichedFilter === 'not_enriched') {
        query = query.is('last_enriched_at', null);
      }

      // Crown filter
      if (crownOnly) {
        query = query.eq('crown', true);
      }

      // Michelin filter
      if (michelinOnly) {
        query = query.gt('michelin_stars', 0);
      }

      // Missing data filters
      if (missingDataFilter === 'no_image') {
        query = query.or('image.is.null,image.eq.');
      } else if (missingDataFilter === 'no_description') {
        query = query.or('description.is.null,description.eq.');
      } else if (missingDataFilter === 'no_content') {
        query = query.or('content.is.null,content.eq.');
      }

      // Sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setDestinations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      setDestinations([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCity, sortField, sortOrder, page, enrichedFilter, crownOnly, michelinOnly, missingDataFilter, itemsPerPage]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedCity, enrichedFilter, crownOnly, michelinOnly, missingDataFilter]);

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
    setEnrichedFilter('all');
    setCrownOnly(false);
    setMichelinOnly(false);
    setMissingDataFilter('all');
  };

  const hasActiveFilters = !!(
    selectedCategory ||
    selectedCity ||
    searchQuery ||
    enrichedFilter !== 'all' ||
    crownOnly ||
    michelinOnly ||
    missingDataFilter !== 'all'
  );

  const activeFilterCount = [
    selectedCategory,
    selectedCity,
    enrichedFilter !== 'all' ? enrichedFilter : '',
    crownOnly ? 'crown' : '',
    michelinOnly ? 'michelin' : '',
    missingDataFilter !== 'all' ? missingDataFilter : '',
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Bulk actions handlers
  const handleBulkEnrich = async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    try {
      // Get slugs for selected items
      const selectedDests = destinations.filter(d => selectedItems.has(d.id!));
      const slugs = selectedDests.map(d => d.slug);

      // Call enrich API for each (could batch this)
      for (const slug of slugs) {
        await fetch('/api/enrich-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
      }

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk enrich failed:', error);
      alert('Failed to enrich destinations');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkCategoryChange = async (category: string) => {
    if (selectedItems.size === 0 || !category) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ category })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      setShowBulkCategoryModal(false);
      fetchDestinations();
    } catch (error) {
      console.error('Bulk category change failed:', error);
      alert('Failed to update categories');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkToggleCrown = async (crownValue: boolean) => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ crown: crownValue })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk crown toggle failed:', error);
      alert('Failed to update crown status');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportSelected = () => {
    const selectedDests = destinations.filter(d => selectedItems.has(d.id!));
    const csv = [
      ['name', 'city', 'category', 'slug', 'michelin_stars', 'crown', 'enriched'].join(','),
      ...selectedDests.map(d => [
        `"${d.name}"`,
        `"${d.city}"`,
        d.category,
        d.slug,
        d.michelin_stars || 0,
        d.crown ? 'Yes' : 'No',
        d.last_enriched_at ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destinations-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white">Content</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
            {totalCount.toLocaleString()} destinations
          </p>
        </div>
        <Button onClick={onCreateNew} size="lg" className="rounded-full px-5 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Toolbar */}
      <div className="space-y-4">
        {/* Search + View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="pl-10 h-10 bg-gray-50 dark:bg-gray-900 border-transparent focus:border-gray-200 dark:focus:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-colors"
            />
          </div>

          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1.5 h-5 min-w-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="table" size="sm">
              <LayoutList className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" size="sm">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="pt-4 pb-2 border-t border-gray-100 dark:border-gray-800/50 space-y-4">
            {/* Dropdowns Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* City Filter */}
              <Popover open={showCityDropdown} onOpenChange={setShowCityDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${selectedCity ? 'border-gray-900 dark:border-gray-100' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                    <span className="max-w-[100px] truncate">{selectedCity || 'All Cities'}</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-2 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search cities..."
                      value={citySearchQuery}
                      onValueChange={setCitySearchQuery}
                    />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setSelectedCity('');
                            setShowCityDropdown(false);
                            setCitySearchQuery('');
                          }}
                        >
                          <Check className={`w-3.5 h-3.5 mr-2 ${!selectedCity ? 'opacity-100' : 'opacity-0'}`} />
                          All Cities
                        </CommandItem>
                        {filteredCities.map((city) => (
                          <CommandItem
                            key={city}
                            onSelect={() => {
                              setSelectedCity(city);
                              setShowCityDropdown(false);
                              setCitySearchQuery('');
                            }}
                          >
                            <Check className={`w-3.5 h-3.5 mr-2 ${selectedCity === city ? 'opacity-100' : 'opacity-0'}`} />
                            {city}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Category Filter */}
              <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? '' : val)}>
                <SelectTrigger className={`w-[150px] h-9 ${selectedCategory ? 'border-gray-900 dark:border-gray-100' : ''}`}>
                  <Tag className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Enrichment Status Filter */}
              <Select value={enrichedFilter} onValueChange={(val) => setEnrichedFilter(val as EnrichedFilter)}>
                <SelectTrigger className={`w-[130px] h-9 ${enrichedFilter !== 'all' ? 'border-gray-900 dark:border-gray-100' : ''}`}>
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enriched">Enriched</SelectItem>
                  <SelectItem value="not_enriched">Not Enriched</SelectItem>
                </SelectContent>
              </Select>

              {/* Missing Data Filter */}
              <Select value={missingDataFilter} onValueChange={(val) => setMissingDataFilter(val as MissingDataFilter)}>
                <SelectTrigger className={`w-[140px] h-9 ${missingDataFilter !== 'all' ? 'border-gray-900 dark:border-gray-100' : ''}`}>
                  <AlertTriangle className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="no_image">Missing Image</SelectItem>
                  <SelectItem value="no_description">Missing Description</SelectItem>
                  <SelectItem value="no_content">Missing Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Filters + Sort Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Filter Toggles */}
              <Button
                variant={crownOnly ? 'default' : 'pill'}
                size="xs"
                onClick={() => setCrownOnly(!crownOnly)}
              >
                <Crown className={`w-3.5 h-3.5 ${crownOnly ? 'text-amber-300' : 'text-amber-500'}`} />
                Crown Only
              </Button>
              <Button
                variant={michelinOnly ? 'default' : 'pill'}
                size="xs"
                onClick={() => setMichelinOnly(!michelinOnly)}
              >
                <img src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5" />
                Michelin Only
              </Button>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort:</span>
                <Select
                  value={`${sortField}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [field, order] = value.split('-') as [SortField, SortOrder];
                    setSortField(field);
                    setSortOrder(order);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="city-asc">City A-Z</SelectItem>
                    <SelectItem value="city-desc">City Z-A</SelectItem>
                    <SelectItem value="category-asc">Category A-Z</SelectItem>
                    <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                    <SelectItem value="created_at-desc">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items per page */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-400">Show:</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(val) => setItemsPerPage(Number(val))}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="xs" onClick={clearFilters}>
                  <X className="w-3 h-3" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Badge variant="secondary">{selectedItems.size} selected</Badge>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Category Change */}
          <Popover open={showBulkCategoryModal} onOpenChange={setShowBulkCategoryModal}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="xs" disabled={bulkActionLoading}>
                <Tag className="w-3.5 h-3.5" />
                Category
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" align="start">
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant="ghost"
                    size="xs"
                    className="w-full justify-start capitalize"
                    onClick={() => handleBulkCategoryChange(cat)}
                    disabled={bulkActionLoading}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Crown Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" disabled={bulkActionLoading}>
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Crown
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleBulkToggleCrown(true)}>
                <Crown className="w-4 h-4 mr-2 text-amber-500" />
                Add Crown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkToggleCrown(false)}>
                <X className="w-4 h-4 mr-2" />
                Remove Crown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Enrich */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleBulkEnrich}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Enrich
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleExportSelected}
            disabled={bulkActionLoading}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </Button>

          <Button
            variant="subtle"
            size="xs"
            onClick={() => setSelectedItems(new Set())}
            className="ml-auto"
          >
            Clear selection
          </Button>
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
        <div className="flex items-center justify-between pt-6">
          <p className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
            {((page - 1) * itemsPerPage) + 1}–{Math.min(page * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
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
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'ghost'}
                    size="xs"
                    onClick={() => setPage(pageNum)}
                    className="w-9 h-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
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
    <Button
      variant="ghost"
      size="xs"
      onClick={() => handleSort(field)}
      className="h-auto px-0 py-0 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-transparent"
    >
      {children}
      {sortField === field && (
        <ArrowUpDown className={`w-3 h-3 opacity-60 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      )}
    </Button>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12">
            <Checkbox
              checked={selectedItems.size === destinations.length && destinations.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </TableHead>
          <TableHead>
            <SortButton field="name">Name</SortButton>
          </TableHead>
          <TableHead className="hidden md:table-cell">
            <SortButton field="city">City</SortButton>
          </TableHead>
          <TableHead className="hidden sm:table-cell">
            <SortButton field="category">Category</SortButton>
          </TableHead>
          <TableHead className="hidden lg:table-cell">
            <span className="text-[11px] uppercase tracking-wide font-medium">Status</span>
          </TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {destinations.map((dest) => (
          <TableRow
            key={dest.id}
            data-state={selectedItems.has(dest.id!) ? 'selected' : undefined}
            className="group"
          >
            <TableCell>
              <Checkbox
                checked={selectedItems.has(dest.id!)}
                onCheckedChange={() => toggleSelect(dest.id!)}
              />
            </TableCell>
            <TableCell>
              <button
                onClick={() => onEdit?.(dest)}
                className="flex items-center gap-3 text-left group/btn"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 group-hover/btn:border-gray-300 dark:group-hover/btn:border-gray-600 transition-colors">
                  {dest.image ? (
                    <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover/btn:text-gray-600 dark:group-hover/btn:text-gray-300 transition-colors">{dest.name}</span>
                    {dest.crown && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {dest.michelin_stars && dest.michelin_stars > 0 && (
                      <div className="flex items-center">
                        {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                          <img key={i} src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5 -ml-0.5 first:ml-0" />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{dest.slug}</span>
                </div>
              </button>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-sm text-gray-500 dark:text-gray-400">{dest.city}</span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="outline" className="capitalize">
                {dest.category}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <div className="flex items-center gap-2">
                {dest.last_enriched_at ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="w-3 h-3" />
                    Enriched
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400">
                    Not enriched
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <RowActions
                destination={dest}
                isActive={activeDropdown === dest.id}
                onToggle={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
                onClose={() => setActiveDropdown(null)}
                onEdit={onEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Grid View Component - Uses homepage card styles
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {destinations.map((dest) => (
        <div key={dest.id} className="relative">
          {/* Selection overlay */}
          <div className={`absolute inset-0 z-10 pointer-events-none rounded-lg transition-all ${
            selectedItems.has(dest.id!)
              ? 'ring-1 ring-gray-400 dark:ring-gray-500 bg-black/5 dark:bg-white/5'
              : ''
          }`} />

          {/* Checkbox */}
          <div className="absolute top-2 left-2 z-20">
            <Checkbox
              checked={selectedItems.has(dest.id!)}
              onCheckedChange={() => toggleSelect(dest.id!)}
              className="bg-white/90 dark:bg-gray-900/90 shadow-sm"
            />
          </div>

          {/* Actions */}
          <div className="absolute top-2 right-2 z-20">
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

          {/* Card using homepage styles */}
          <button
            onClick={() => onEdit?.(dest)}
            className={`${CARD_WRAPPER} w-full text-left`}
          >
            <div className={CARD_MEDIA}>
              {dest.image ? (
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}
              {/* Michelin stars badge */}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-medium flex items-center gap-0.5">
                  {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                    <img key={i} src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
                  ))}
                </div>
              )}
              {/* Crown badge */}
              {dest.crown && (
                <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-900 p-1.5 rounded">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{dest.name}</div>
              <div className={CARD_META}>
                <MapPin className="h-3 w-3" />
                <span>{dest.city}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="capitalize">{dest.category}</span>
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
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}: {
  destination: Destination;
  isActive?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onEdit?: (destination: Destination) => void;
  onDelete: (id: number) => void;
  onDuplicate: (destination: Destination) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={compact ? 'bg-white/90 dark:bg-gray-900/90 shadow-sm' : 'opacity-0 group-hover:opacity-100'}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => onEdit?.(destination)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit
        </DropdownMenuItem>
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
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Loading State
function LoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Search className="w-7 h-7 text-gray-400 dark:text-gray-600" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-3">No destinations found</p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
