'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Edit, Search, X, Eye, Users, MousePointerClick, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stripHtmlTags } from "@/lib/stripHtmlTags";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Destination Form Component
function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving
}: {
  destination?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    category: destination?.category || '',
    description: stripHtmlTags(destination?.description || ''),
    content: stripHtmlTags(destination?.content || ''),
    image: destination?.image || '',
    michelin_stars: destination?.michelin_stars || null,
    crown: destination?.crown || false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);

  // Update form when destination changes
  useEffect(() => {
    if (destination) {
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        description: stripHtmlTags(destination.description || ''),
        content: stripHtmlTags(destination.content || ''),
        image: destination.image || '',
        michelin_stars: destination.michelin_stars || null,
        crown: destination.crown || false,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);
    } else {
      setFormData({
        slug: '',
        name: '',
        city: '',
        category: '',
        description: '',
        content: '',
        image: '',
        michelin_stars: null,
        crown: false,
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [destination]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);
      formDataToSend.append('slug', formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Image upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchFromGoogle = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name first');
      return;
    }

    setFetchingGoogle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch from Google');
      }

      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: stripHtmlTags(data.description || prev.description),
        content: stripHtmlTags(data.content || prev.content),
        image: data.image || prev.image,
      }));

      if (data.image) {
        setImagePreview(data.image);
      }

      alert(`✅ Fetched data from Google Places!\n\nName: ${data.name}\nCity: ${data.city}\nCategory: ${data.category || 'Not found'}`);
    } catch (error: any) {
      console.error('Fetch Google error:', error);
      alert(`Failed to fetch from Google: ${error.message}`);
    } finally {
      setFetchingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return;
      }
    }

    const data: any = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : null,
    };
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name *</label>
            <div className="flex gap-2">
              <GooglePlacesAutocomplete
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                onPlaceSelect={async (placeDetails: any) => {
                  if (placeDetails.placeId) {
                    setFetchingGoogle(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      if (!token) throw new Error('Not authenticated');

                      const response = await fetch('/api/fetch-google-place', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ placeId: placeDetails.placeId }),
                      });
                      const data = await response.json();
                      if (data.error) {
                        console.error('Error fetching place:', data.error);
                        return;
                      }
                      setFormData(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        city: data.city || prev.city,
                        category: data.category || prev.category,
                        description: stripHtmlTags(data.description || ''),
                        content: stripHtmlTags(data.content || ''),
                        image: data.image || prev.image,
                      }));
                      if (data.image) {
                        setImagePreview(data.image);
                      }
                    } catch (error) {
                      console.error('Error:', error);
                    } finally {
                      setFetchingGoogle(false);
                    }
                  }
                }}
                placeholder="Start typing a place name..."
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                types="establishment"
              />
              <Button
                type="button"
                onClick={fetchFromGoogle}
                disabled={fetchingGoogle || !formData.name.trim()}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                {fetchingGoogle ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Details'
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated if empty"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Tokyo"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category *</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., restaurant, hotel, cafe"
            />
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Image</h3>
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload-input"
            />
            <label
              htmlFor="image-upload-input"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-2xl mb-3"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      const input = document.getElementById('image-upload-input') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Drag & drop an image here
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    or click to browse
                  </span>
                </>
              )}
            </label>
          </div>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => {
              setFormData({ ...formData, image: e.target.value });
              if (!imageFile) {
                setImagePreview(e.target.value || null);
              }
            }}
            placeholder="Or enter image URL"
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {uploadingImage && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Content</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Short Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="A brief, punchy description (1-2 sentences)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Detailed description of the destination"
            />
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Michelin Stars</label>
            <input
              type="number"
              min="0"
              max="3"
              value={formData.michelin_stars || ''}
              onChange={(e) => setFormData({ ...formData, michelin_stars: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0-3"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="crown-checkbox"
              checked={formData.crown}
              onChange={(e) => setFormData({ ...formData, crown: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="crown-checkbox" className="text-sm font-medium cursor-pointer">
              Crown (Featured)
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="outline" disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="min-w-[100px]">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : destination ? (
            'Update Place'
          ) : (
            'Create Place'
          )}
        </Button>
      </div>
    </form>
  );
}

// Analytics Stats Component
function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalSearches: 0,
    totalSaves: 0,
    totalUsers: 0,
    topSearches: [] as { query: string; count: number }[],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('interaction_type');

      const { data: visits } = await supabase
        .from('visit_history')
        .select('destination_id, search_query');

      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const views = interactions?.filter(i => i.interaction_type === 'view').length || 0;
      const searches = visits?.filter(v => v.search_query).length || 0;
      const saves = interactions?.filter(i => i.interaction_type === 'save').length || 0;

      const searchQueries = visits?.map(v => v.search_query).filter(Boolean) || [];
      const searchCounts: Record<string, number> = {};
      searchQueries.forEach((q: string) => {
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      });
      const topSearches = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalViews: views,
        totalSearches: searches,
        totalSaves: saves,
        totalUsers: userCount || 0,
        topSearches,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Views</div>
            <Eye className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Searches</div>
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totalSearches.toLocaleString()}</div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Saves</div>
            <MousePointerClick className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totalSaves.toLocaleString()}</div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Users</div>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
        </div>
      </div>

      {/* Top Searches */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Search Queries
        </h2>
        {stats.topSearches.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No search data available yet</p>
        ) : (
          <div className="space-y-2">
            {stats.topSearches.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <span className="font-medium text-sm">{item.query}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.count} searches</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Search Log Component
function SearchLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSearchLogs();
  }, []);

  async function loadSearchLogs() {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, interaction_type, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading search logs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">Time</th>
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">User</th>
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">Query</th>
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">City</th>
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">Category</th>
              <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 dark:text-gray-400">Results</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const q = log.metadata?.query || '';
              const intent = log.metadata?.intent || {};
              const filters = log.metadata?.filters || {};
              const count = log.metadata?.count ?? '';

              return (
                <tr key={log.id} className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 ${index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/50'}`}>
                  <td className="py-3 px-4 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">{log.user_id ? log.user_id.slice(0, 8) : 'anon'}</td>
                  <td className="py-3 px-4 max-w-xs truncate" title={q}>{q}</td>
                  <td className="py-3 px-4 text-xs">{intent.city || filters.city || '-'}</td>
                  <td className="py-3 px-4 text-xs">{intent.category || filters.category || '-'}</td>
                  <td className="py-3 px-4 text-xs">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          No search logs available
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'destinations' | 'analytics' | 'searches'>('destinations');

  // Destinations tab state
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/account');
        return;
      }

      setUser(session.user);
      const role = (session.user.app_metadata as Record<string, any> | null)?.role;
      const admin = role === 'admin';
      setIsAdmin(admin);
      setAuthChecked(true);
      if (!admin) {
        router.push('/account');
      }
    }

    checkAuth();
  }, [router]);

  // Load destination list when search or offset changes
  useEffect(() => {
    if (isAdmin && authChecked && activeTab === 'destinations') {
      loadDestinationList();
    }
  }, [isAdmin, authChecked, activeTab, listOffset, listSearchQuery]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showCreateModal) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showCreateModal]);

  const loadDestinationList = async () => {
    setIsLoadingList(true);
    try {
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown')
        .order('slug', { ascending: true });

      if (listSearchQuery.trim()) {
        query = query.or(`name.ilike.%${listSearchQuery}%,city.ilike.%${listSearchQuery}%,slug.ilike.%${listSearchQuery}%,category.ilike.%${listSearchQuery}%`);
      }

      const { data, error } = await query.range(listOffset, listOffset + 19);

      if (error) {
        console.error('Supabase error:', error);
        setDestinationList([]);
        return;
      }
      setDestinationList(data || []);
    } catch (e: any) {
      console.error('Error loading destinations:', e);
      setDestinationList([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Show loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <main className="px-6 md:px-10 py-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <main className="px-6 md:px-10 py-12 dark:text-white">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-light">Admin Dashboard</h1>
              <Button onClick={() => router.push('/account')} variant="outline" size="sm">
                Back to Account
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </span>
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">Admin</Badge>
            </div>
          </div>

          {/* Tab Navigation - Minimal style like /account */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {['destinations', 'analytics', 'searches'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`transition-all ${
                    activeTab === tab
                      ? "font-medium text-black dark:text-white"
                      : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'destinations' && (
            <div className="space-y-6 fade-in">
              {/* Search and Actions Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={listSearchQuery}
                    onChange={(e) => {
                      setListSearchQuery(e.target.value);
                      setListOffset(0);
                    }}
                    placeholder="Search destinations..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
                  />
                  {listSearchQuery && (
                    <button
                      onClick={() => setListSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowCreateModal(true);
                  }}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add Place
                </Button>
              </div>

              {/* Destination List */}
              {isLoadingList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : destinationList.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  No destinations found
                </div>
              ) : (
                <div className="space-y-2">
                  {destinationList.map((dest: any) => (
                    <div
                      key={dest.slug}
                      className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      {/* Thumbnail */}
                      {dest.image && (
                        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img
                            src={dest.image}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{dest.name}</span>
                          {dest.crown && <span className="text-xs">👑</span>}
                          {dest.michelin_stars && (
                            <span className="text-xs">{'⭐'.repeat(dest.michelin_stars)}</span>
                          )}
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>{dest.city}</span>
                          <span>•</span>
                          <span>{dest.category}</span>
                          {dest.google_place_id && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-400">Enriched</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        onClick={() => {
                          setEditingDestination(dest);
                          setShowCreateModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  onClick={() => setListOffset(Math.max(0, listOffset - 20))}
                  variant="outline"
                  size="sm"
                  disabled={listOffset === 0 || isLoadingList}
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-500">
                  Showing {listOffset + 1}-{listOffset + destinationList.length}
                </span>
                <Button
                  onClick={() => setListOffset(listOffset + 20)}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingList || destinationList.length < 20}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="fade-in">
              <AnalyticsTab />
            </div>
          )}

          {activeTab === 'searches' && (
            <div className="fade-in">
              <SearchLogTab />
            </div>
          )}

          {/* Create/Edit Drawer */}
          {showCreateModal && (
            <>
              <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDestination(null);
                }}
              />

              <div
                className={`fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
                  showCreateModal ? 'translate-x-0' : 'translate-x-full'
                } overflow-y-auto`}
              >
                <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-semibold">
                    {editingDestination ? 'Edit Destination' : 'Create New Destination'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingDestination(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  <DestinationForm
                    destination={editingDestination}
                    onSave={async (data) => {
                      setIsSaving(true);
                      try {
                        if (editingDestination) {
                          const { error } = await supabase
                            .from('destinations')
                            .update(data)
                            .eq('slug', editingDestination.slug);

                          if (error) throw error;
                        } else {
                          if (!data.slug && data.name) {
                            data.slug = data.name.toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)/g, '');
                          }

                          const { error } = await supabase
                            .from('destinations')
                            .insert([data]);

                          if (error) throw error;
                        }

                        setShowCreateModal(false);
                        setEditingDestination(null);
                        await loadDestinationList();
                      } catch (e: any) {
                        alert(`Error: ${e.message}`);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    onCancel={() => {
                      setShowCreateModal(false);
                      setEditingDestination(null);
                    }}
                    isSaving={isSaving}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
