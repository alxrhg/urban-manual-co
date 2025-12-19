'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Search, Plus, Pencil, Trash2, X, Upload, Loader2, ChevronLeft, MoreVertical,
  Building2, MapPin, Globe, Map, AlertCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

// Use API route for admin operations to bypass RLS
async function apiRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const url = method === 'GET' || method === 'DELETE'
    ? `/api/admin/data?${new URLSearchParams(params as Record<string, string>)}`
    : '/api/admin/data';

  const res = await fetch(url, {
    method,
    headers: method !== 'GET' && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {},
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(params) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  category: string | null;
}

interface City {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  slug: string;
  image_url: string | null;
  description: string | null;
}

interface Country {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  flag_emoji: string | null;
  image_url: string | null;
}

interface Neighborhood {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
}

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods';
type DataItem = Brand | City | Country | Neighborhood;

interface DataManagerProps {
  type: DataType;
}

const BRAND_CATEGORIES = [
  'Luxury Hotel',
  'Upper Upscale Hotel',
  'Upscale Hotel',
  'Boutique Hotel',
  'Lifestyle Hotel',
  'Restaurant Group',
  'Hospitality Group',
  'Other',
];

const TYPE_CONFIG = {
  brands: { singular: 'Brand', plural: 'Brands', icon: Building2 },
  cities: { singular: 'City', plural: 'Cities', icon: MapPin },
  countries: { singular: 'Country', plural: 'Countries', icon: Globe },
  neighborhoods: { singular: 'Neighborhood', plural: 'Neighborhoods', icon: Map },
};

const toSlug = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export function DataManager({ type }: DataManagerProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ found: number; inserted: number; existing: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | null>>({});

  const supabase = createClient({ skipValidation: true });
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    fetchData();
  }, [type]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showDrawer) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showDrawer]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ data: DataItem[] }>('GET', { type });
      setItems(result.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      if (message.includes('does not exist')) {
        setError(`The "${type}" table doesn't exist yet. Please run the database migration first.`);
      } else {
        setError(message);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDrawer = () => {
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (item: DataItem) => {
    setEditingItem(item);
    setFormData({ ...item } as Record<string, string | null>);
    setSaveError(null);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const slug = formData.slug || toSlug(formData.name || '');
      const { id: _id, ...restFormData } = formData as Record<string, string | null> & { id?: string };
      const insertData = { ...restFormData, slug };

      if (editingItem) {
        await apiRequest('PUT', { type, id: editingItem.id, data: insertData });
      } else {
        await apiRequest('POST', { type, data: insertData });
      }
      await fetchData();
      closeDrawer();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';

      if (message.includes('does not exist')) {
        setSaveError(`The "${type}" table doesn't exist. Please run the database migration first.`);
      } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
        setSaveError('An item with this name or slug already exists.');
      } else if (message.includes('Unauthorized')) {
        setSaveError('You must be logged in as an admin to perform this action.');
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await apiRequest('DELETE', { type, id });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      alert(`Error: ${message}`);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data.results?.[type] || { found: 0, inserted: 0, existing: 0 });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      alert(`Sync error: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, [field]: publicUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload';
      alert(`Upload error: ${message}`);
    }
  };

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (item.name.toLowerCase().includes(query)) return true;
      if ('country' in item && item.country?.toLowerCase().includes(query)) return true;
      if ('city' in item && item.city?.toLowerCase().includes(query)) return true;
      return false;
    });
  };

  const filteredItems = getFilteredItems();
  const Icon = config.icon;

  const inputClasses = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">{config.plural}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length.toLocaleString()} {type}
            {syncResult && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (found {syncResult.found} in destinations: {syncResult.inserted} new, {syncResult.existing} existing)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-full"
            title={`Sync ${type} from existing destinations`}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync from Destinations'}
          </Button>
          <Button onClick={openCreateDrawer} className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Database Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${type}...`}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                  {config.singular}
                </th>
                {type === 'brands' && (
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Category
                  </th>
                )}
                {(type === 'cities' || type === 'neighborhoods') && (
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Location
                  </th>
                )}
                {type === 'countries' && (
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Code
                  </th>
                )}
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Slug
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                  onClick={() => openEditDrawer(item)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {('logo_url' in item && item.logo_url) || ('image_url' in item && item.image_url) ? (
                        <img
                          src={('logo_url' in item ? item.logo_url : (item as City | Country | Neighborhood).image_url) || ''}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          {type === 'countries' && 'flag_emoji' in item && item.flag_emoji ? (
                            <span className="text-xl">{item.flag_emoji}</span>
                          ) : (
                            <Icon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                        {'website' in item && item.website && (
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Website <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  {type === 'brands' && (
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {'category' in item ? item.category || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {(type === 'cities' || type === 'neighborhoods') && (
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {'city' in item && item.city ? `${item.city}, ` : ''}
                        {'country' in item ? item.country || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {type === 'countries' && (
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {'code' in item ? item.code || '—' : '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {item.slug}
                    </code>
                  </td>
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDrawer(item); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    No {type} found. {searchQuery ? 'Try a different search.' : `Add your first ${config.singular.toLowerCase()}!`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Drawer */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={closeDrawer}
          />
          {/* Drawer Panel */}
          <div
            className={`fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
              showDrawer ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDrawer}
                  className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingItem ? editingItem.name || `Edit ${config.singular}` : `New ${config.singular}`}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Error in drawer */}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={labelClasses}>Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: toSlug(e.target.value) })}
                  className={inputClasses}
                  placeholder="Enter name"
                />
              </div>

              {/* Slug */}
              <div>
                <label className={labelClasses}>Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={inputClasses}
                  placeholder="auto-generated-slug"
                />
              </div>

              {/* Brand-specific fields */}
              {type === 'brands' && (
                <>
                  <div>
                    <label className={labelClasses}>Logo</label>
                    <div className="flex items-center gap-3">
                      {formData.logo_url && (
                        <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Logo</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="">Select category...</option>
                      {BRAND_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Website</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={inputClasses}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              {/* City-specific fields */}
              {type === 'cities' && (
                <>
                  <div>
                    <label className={labelClasses}>Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={inputClasses}
                      placeholder="Country name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Region</label>
                    <input
                      type="text"
                      value={formData.region || ''}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className={inputClasses}
                      placeholder="State/Province/Region"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="City" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              {/* Country-specific fields */}
              {type === 'countries' && (
                <>
                  <div>
                    <label className={labelClasses}>Country Code (ISO)</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={inputClasses}
                      placeholder="US, GB, JP..."
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Flag Emoji</label>
                    <input
                      type="text"
                      value={formData.flag_emoji || ''}
                      onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })}
                      className={inputClasses}
                      placeholder="🇺🇸"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Country" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Neighborhood-specific fields */}
              {type === 'neighborhoods' && (
                <>
                  <div>
                    <label className={labelClasses}>City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={inputClasses}
                      placeholder="City name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={inputClasses}
                      placeholder="Country name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Neighborhood" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
