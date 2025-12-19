'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Building2, MapPin, Globe, Map, Plus, Pencil, Trash2, X, Upload, Loader2, Search, ChevronDown
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

type TabId = 'brands' | 'cities' | 'countries' | 'neighborhoods';

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

const toSlug = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export function DataManager() {
  const [activeTab, setActiveTab] = useState<TabId>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Brand | City | Country | Neighborhood | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | null>>({});

  const supabase = createClient({ skipValidation: true });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'brands') {
        const { data } = await supabase.from('brands').select('*').order('name');
        setBrands(data || []);
      } else if (activeTab === 'cities') {
        const { data } = await supabase.from('cities').select('*').order('name');
        setCities(data || []);
      } else if (activeTab === 'countries') {
        const { data } = await supabase.from('countries').select('*').order('name');
        setCountries(data || []);
      } else if (activeTab === 'neighborhoods') {
        const { data } = await supabase.from('neighborhoods').select('*').order('name');
        setNeighborhoods(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: Brand | City | Country | Neighborhood) => {
    setEditingItem(item);
    setFormData({ ...item } as Record<string, string | null>);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const table = activeTab;
      const slug = formData.slug || toSlug(formData.name || '');
      const dataToSave = { ...formData, slug };

      if (editingItem) {
        await supabase.from(table).update(dataToSave).eq('id', editingItem.id);
      } else {
        await supabase.from(table).insert(dataToSave);
      }
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await supabase.from(activeTab).delete().eq('id', id);
      await fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeTab}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, [field]: publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    if (activeTab === 'brands') {
      return brands.filter(b => b.name.toLowerCase().includes(query));
    } else if (activeTab === 'cities') {
      return cities.filter(c => c.name.toLowerCase().includes(query) || c.country?.toLowerCase().includes(query));
    } else if (activeTab === 'countries') {
      return countries.filter(c => c.name.toLowerCase().includes(query));
    } else {
      return neighborhoods.filter(n => n.name.toLowerCase().includes(query) || n.city?.toLowerCase().includes(query));
    }
  };

  const tabs = [
    { id: 'brands' as TabId, label: 'Brands', icon: Building2, count: brands.length },
    { id: 'cities' as TabId, label: 'Cities', icon: MapPin, count: cities.length },
    { id: 'countries' as TabId, label: 'Countries', icon: Globe, count: countries.length },
    { id: 'neighborhoods' as TabId, label: 'Neighborhoods', icon: Map, count: neighborhoods.length },
  ];

  const inputClasses = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage brands, cities, countries, and neighborhoods
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              activeTab === tab.id
                ? "bg-white/20 dark:bg-black/20"
                : "bg-gray-200 dark:bg-gray-700"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab}...`}
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
          {getFilteredItems().map((item: Brand | City | Country | Neighborhood) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Logo/Image Preview */}
                  {('logo_url' in item && item.logo_url) || ('image_url' in item && item.image_url) ? (
                    <img
                      src={('logo_url' in item ? item.logo_url : item.image_url) || ''}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {activeTab === 'brands' && <Building2 className="h-6 w-6 text-gray-400" />}
                      {activeTab === 'cities' && <MapPin className="h-6 w-6 text-gray-400" />}
                      {activeTab === 'countries' && (
                        'flag_emoji' in item && item.flag_emoji ? (
                          <span className="text-2xl">{item.flag_emoji}</span>
                        ) : (
                          <Globe className="h-6 w-6 text-gray-400" />
                        )
                      )}
                      {activeTab === 'neighborhoods' && <Map className="h-6 w-6 text-gray-400" />}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                    {'category' in item && item.category && (
                      <span className="text-xs text-gray-500">{item.category}</span>
                    )}
                    {'country' in item && item.country && (
                      <span className="text-xs text-gray-500">{item.country}</span>
                    )}
                    {'city' in item && item.city && (
                      <span className="text-xs text-gray-500">{item.city}{item.country ? `, ${item.country}` : ''}</span>
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
              {('description' in item && item.description) && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {item.description}
                </p>
              )}
              {('website' in item && item.website) && (
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

          {getFilteredItems().length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No {activeTab} found. {searchQuery ? 'Try a different search.' : `Add your first ${activeTab.slice(0, -1)}!`}
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
                {editingItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
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
              {activeTab === 'brands' && (
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
              {activeTab === 'cities' && (
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
              {activeTab === 'countries' && (
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
              {activeTab === 'neighborhoods' && (
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
