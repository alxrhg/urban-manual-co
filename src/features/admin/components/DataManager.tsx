'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Building2, MapPin, Globe, Map, Plus, Pencil, Trash2, X, Upload, Loader2, Search, AlertCircle
} from 'lucide-react';

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
  brands: { singular: 'Brand', icon: Building2, imageField: 'logo_url' },
  cities: { singular: 'City', icon: MapPin, imageField: 'image_url' },
  countries: { singular: 'Country', icon: Globe, imageField: 'image_url' },
  neighborhoods: { singular: 'Neighborhood', icon: Map, imageField: 'image_url' },
};

const toSlug = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export function DataManager({ type }: DataManagerProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | null>>({});

  const supabase = createClient({ skipValidation: true });
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from(type).select('*').order('name');
      if (fetchError) {
        if (fetchError.message.includes('does not exist')) {
          setError(`The "${type}" table doesn't exist yet. Please run the database migration first.`);
        } else {
          setError(fetchError.message);
        }
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (item: DataItem) => {
    setEditingItem(item);
    setFormData({ ...item } as Record<string, string | null>);
    setSaveError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const slug = formData.slug || toSlug(formData.name || '');
      const dataToSave = { ...formData, slug };

      // Remove id from dataToSave for insert
      const { id, ...insertData } = dataToSave;

      if (editingItem) {
        const { error } = await supabase.from(type).update(dataToSave).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(type).insert(insertData);
        if (error) throw error;
      }
      await fetchData();
      closeModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      if (message.includes('does not exist')) {
        setSaveError(`The "${type}" table doesn't exist. Please run the database migration first.`);
      } else if (message.includes('duplicate key')) {
        setSaveError('An item with this name or slug already exists.');
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
      const { error } = await supabase.from(type).delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      alert(`Error: ${message}`);
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

  const inputClasses = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.singular} Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage {type} for your destinations
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add {config.singular}
        </button>
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${type}...`}
          className={cn(inputClasses, "pl-10")}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getFilteredItems().map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Logo/Image Preview */}
                  {('logo_url' in item && item.logo_url) || ('image_url' in item && item.image_url) ? (
                    <img
                      src={('logo_url' in item ? item.logo_url : (item as City | Country | Neighborhood).image_url) || ''}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {type === 'countries' && 'flag_emoji' in item && item.flag_emoji ? (
                        <span className="text-2xl">{item.flag_emoji}</span>
                      ) : (
                        <Icon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                    {'category' in item && item.category && (
                      <span className="text-xs text-gray-500">{item.category}</span>
                    )}
                    {'country' in item && item.country && !('city' in item) && (
                      <span className="text-xs text-gray-500">{item.country}</span>
                    )}
                    {'city' in item && item.city && (
                      <span className="text-xs text-gray-500">
                        {item.city}{('country' in item && item.country) ? `, ${item.country}` : ''}
                      </span>
                    )}
                    {'code' in item && item.code && (
                      <span className="text-xs text-gray-500 ml-1">({item.code})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {'description' in item && item.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {item.description}
                </p>
              )}
              {'website' in item && item.website && (
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-xs text-blue-600 hover:underline truncate block"
                >
                  {item.website}
                </a>
              )}
            </div>
          ))}

          {getFilteredItems().length === 0 && !error && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No {type} found. {searchQuery ? 'Try a different search.' : `Add your first ${config.singular.toLowerCase()}!`}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit' : 'Add'} {config.singular}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Error in modal */}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Common: Name */}
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

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
