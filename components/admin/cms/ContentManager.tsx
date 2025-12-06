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
  Download,
  Sparkles,
  AlertTriangle,
  FileText,
  Tag,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Content</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount.toLocaleString()} destinations
          </p>
        </div>
        <Button onClick={onCreateNew} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 space-y-4">
        {/* Search + View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10"
            />
          </div>

          <Button
            variant={showFilters || hasActiveFilters ? 'outline' : 'ghost'}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters || hasActiveFilters ? 'border-black dark:border-white' : ''}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <div className="hidden sm:flex items-center border border-gray-200 dark:border-gray-800 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-800' : ''}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 pt-2">
            {/* Row 1: City, Category, Status */}
            <div className="flex flex-wrap items-center gap-3">
              {/* City Filter */}
              <Popover open={showCityDropdown} onOpenChange={setShowCityDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={selectedCity ? 'border-black dark:border-white' : ''}
                  >
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedCity || 'All Cities'}
                    <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search cities..."
                      value={citySearchQuery}
                      onValueChange={setCitySearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setSelectedCity('');
                            setShowCityDropdown(false);
                            setCitySearchQuery('');
                          }}
                          className={!selectedCity ? 'font-medium' : ''}
                        >
                          <Check className={`w-4 h-4 mr-2 ${!selectedCity ? 'opacity-100' : 'opacity-0'}`} />
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
                            className={selectedCity === city ? 'font-medium' : ''}
                          >
                            <Check className={`w-4 h-4 mr-2 ${selectedCity === city ? 'opacity-100' : 'opacity-0'}`} />
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
                <SelectTrigger className="w-[160px]">
                  <Tag className="w-4 h-4 mr-2 text-gray-400" />
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
                <SelectTrigger className="w-[150px]">
                  <Sparkles className="w-4 h-4 mr-2 text-gray-400" />
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
                <SelectTrigger className="w-[160px]">
                  <AlertTriangle className="w-4 h-4 mr-2 text-gray-400" />
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

            {/* Row 2: Quick Filters + Sort */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Filter Toggles */}
              <div className="flex items-center gap-2">
                <Button
                  variant={crownOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCrownOnly(!crownOnly)}
                  className="h-8"
                >
                  <Crown className={`w-3.5 h-3.5 mr-1.5 ${crownOnly ? 'text-amber-200' : 'text-amber-500'}`} />
                  Crown Only
                </Button>
                <Button
                  variant={michelinOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMichelinOnly(!michelinOnly)}
                  className="h-8"
                >
                  <Star className={`w-3.5 h-3.5 mr-1.5 ${michelinOnly ? 'text-red-200' : 'text-red-500'}`} />
                  Michelin Only
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Sort:</span>
                <Select
                  value={`${sortField}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [field, order] = value.split('-') as [SortField, SortOrder];
                    setSortField(field);
                    setSortOrder(order);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
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
                <span className="text-xs text-gray-500 dark:text-gray-400">Show:</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(val) => setItemsPerPage(Number(val))}
                >
                  <SelectTrigger className="w-[80px]">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-gray-500"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <Badge variant="secondary" className="font-medium">{selectedItems.size} selected</Badge>
          <Separator orientation="vertical" className="h-5" />

          {/* Category Change */}
          <Popover open={showBulkCategoryModal} onOpenChange={setShowBulkCategoryModal}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkActionLoading}>
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Category
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-2">Change category to:</p>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant="ghost"
                    size="sm"
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
              <Button variant="ghost" size="sm" disabled={bulkActionLoading}>
                <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Crown
                <ChevronDown className="w-3 h-3 ml-1" />
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
            size="sm"
            onClick={handleBulkEnrich}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Enrich
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportSelected}
            disabled={bulkActionLoading}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Separator orientation="vertical" className="h-5" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
            Delete
          </Button>

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
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
            {((page - 1) * itemsPerPage) + 1}–{Math.min(page * itemsPerPage, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
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
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
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
              <Checkbox
                checked={selectedItems.size === destinations.length && destinations.length > 0}
                onCheckedChange={toggleSelectAll}
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
                <Checkbox
                  checked={selectedItems.has(dest.id!)}
                  onCheckedChange={() => toggleSelect(dest.id!)}
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
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <Check className="w-3 h-3" />
                      Enriched
                    </Badge>
                  )}
                  {dest.image && (
                    <Badge variant="secondary" className="text-[10px]">
                      <ImageIcon className="w-3 h-3" />
                    </Badge>
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
                <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-red-500 fill-red-500" />
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
          size="icon"
          className={compact ? 'bg-white/90 dark:bg-gray-900/90 shadow-sm h-8 w-8' : 'h-8 w-8'}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
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

// Loading State - Matches homepage card skeleton
function LoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
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
        <Button variant="link" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
