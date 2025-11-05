'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Edit, Search, X, Trash2, Eye, MousePointerClick, Users, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stripHtmlTags } from "@/lib/stripHtmlTags";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type Tab = 'destinations' | 'analytics' | 'searches';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload image if file selected
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
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-4">Basic Information</h3>
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
                placeholder="Start typing to search Google Places..."
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                types="establishment"
              />
            </div>
            {fetchingGoogle && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching from Google Places...
              </div>
            )}
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
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., restaurant, hotel, cafe"
            />
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-4">Image</h3>
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
              id="image-upload"
            />
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer">
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-2xl" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <span className="text-sm font-medium">Drag & drop or click to upload</span>
                </>
              )}
            </label>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">or</div>

          <input
            type="url"
            value={formData.image}
            onChange={(e) => {
              setFormData({ ...formData, image: e.target.value });
              if (!imageFile) {
                setImagePreview(e.target.value || null);
              }
            }}
            placeholder="Enter image URL"
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-4">Content</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Short Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="A brief, punchy description (1-2 sentences)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Detailed description, atmosphere, best time to visit, etc."
            />
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="pb-6">
        <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-4">Additional Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Michelin Stars</label>
            <input
              type="number"
              min="0"
              max="3"
              value={formData.michelin_stars || ''}
              onChange={(e) => setFormData({ ...formData, michelin_stars: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
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
              Featured (Crown)
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button type="button" onClick={onCancel} variant="outline" disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="min-w-[120px]">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : destination ? (
            'Update'
          ) : (
            'Create'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('destinations');

  // Destination CMS state
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    needsEnrichment: 0,
  });

  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState({
    totalViews: 0,
    totalSearches: 0,
    totalSaves: 0,
    totalUsers: 0,
    topSearches: [] as { query: string; count: number }[],
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Search logs state
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [isLoadingSearchLogs, setIsLoadingSearchLogs] = useState(false);

  const ITEMS_PER_PAGE = 20;

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

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin || !authChecked) return;

    if (activeTab === 'destinations') {
      loadDestinations();
      loadStats();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'searches') {
      loadSearchLogs();
    }
  }, [activeTab, isAdmin, authChecked, currentPage, searchQuery]);

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

  const loadDestinations = async () => {
    setIsLoadingDestinations(true);
    try {
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, image, google_place_id, crown, michelin_stars')
        .order('name', { ascending: true });

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.range(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE - 1
      );

      if (error) throw error;
      setDestinations(data || []);
    } catch (e: any) {
      console.error('Error loading destinations:', e);
      setDestinations([]);
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('google_place_id');

      if (error) throw error;

      const total = data?.length || 0;
      const enriched = data?.filter(d => d.google_place_id).length || 0;

      setStats({
        total,
        enriched,
        needsEnrichment: total - enriched,
      });
    } catch (e: any) {
      console.error('Error loading stats:', e);
    }
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('interaction_type');

      const { data: visits } = await supabase
        .from('visit_history')
        .select('search_query');

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

      setAnalyticsStats({
        totalViews: views,
        totalSearches: searches,
        totalSaves: saves,
        totalUsers: userCount || 0,
        topSearches,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadSearchLogs = async () => {
    setIsLoadingSearchLogs(true);
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setSearchLogs(data || []);
    } catch (e: any) {
      console.error('Error loading search logs:', e);
      setSearchLogs([]);
    } finally {
      setIsLoadingSearchLogs(false);
    }
  };

  const handleSave = async (data: any) => {
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

      setShowDrawer(false);
      setEditingDestination(null);
      await loadDestinations();
      await loadStats();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this destination? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('slug', slug);

      if (error) throw error;

      await loadDestinations();
      await loadStats();
    } catch (e: any) {
      alert(`Error deleting destination: ${e.message}`);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">{user?.email}</span>
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800">
            {(['destinations', 'analytics', 'searches'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 transition-all text-sm ${
                  activeTab === tab
                    ? "font-medium text-black dark:text-white border-b-2 border-black dark:border-white"
                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Destinations Tab */}
          {activeTab === 'destinations' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                  <div className="text-3xl font-bold mb-1">{stats.total}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Destinations</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                  <div className="text-3xl font-bold mb-1">{stats.enriched}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Enriched with Google Data</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                  <div className="text-3xl font-bold mb-1">{stats.needsEnrichment}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Needs Enrichment</div>
                </div>
              </div>

              {/* Search and Actions */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    placeholder="Search destinations by name, city, slug, or category..."
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowDrawer(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Destination
                </Button>
              </div>

              {/* Destinations Table */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {isLoadingDestinations ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : destinations.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    {searchQuery ? 'No destinations found matching your search' : 'No destinations yet'}
                  </div>
                ) : (
                  <>
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Destination</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Category</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Status</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {destinations.map((dest) => (
                          <tr key={dest.slug} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                  {dest.image ? (
                                    <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                      No img
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {dest.name}
                                    {dest.crown && <span className="text-yellow-500">👑</span>}
                                    {dest.michelin_stars > 0 && (
                                      <span className="text-xs">{'⭐'.repeat(dest.michelin_stars)}</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{dest.city}</div>
                                  <div className="text-xs text-gray-400 font-mono">{dest.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="text-xs">
                                {dest.category}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {dest.google_place_id ? (
                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  Enriched
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Not Enriched
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/destination/${dest.slug}`, '_blank')}
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingDestination(dest);
                                    setShowDrawer(true);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(dest.slug)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {currentPage * ITEMS_PER_PAGE + 1} - {Math.min((currentPage + 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE + destinations.length)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={destinations.length < ITEMS_PER_PAGE}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {isLoadingAnalytics ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
                        <Eye className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-3xl font-bold">{analyticsStats.totalViews.toLocaleString()}</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Searches</div>
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-3xl font-bold">{analyticsStats.totalSearches.toLocaleString()}</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Saves</div>
                        <MousePointerClick className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-3xl font-bold">{analyticsStats.totalSaves.toLocaleString()}</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-3xl font-bold">{analyticsStats.totalUsers.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Top Searches */}
                  <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Top Search Queries
                    </h2>
                    {analyticsStats.topSearches.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">No search data available yet</p>
                    ) : (
                      <div className="space-y-2">
                        {analyticsStats.topSearches.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                            <span className="font-medium">{item.query}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.count} searches</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Search Logs Tab */}
          {activeTab === 'searches' && (
            <div className="space-y-6">
              {isLoadingSearchLogs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {searchLogs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No search logs yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Time</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">User</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Query</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">City</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Category</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Results</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {searchLogs.map((log) => {
                            const q = log.metadata?.query || '';
                            const intent = log.metadata?.intent || {};
                            const filters = log.metadata?.filters || {};
                            const count = log.metadata?.count ?? '';
                            const source = log.metadata?.source || '';
                            return (
                              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                <td className="px-6 py-3 whitespace-nowrap text-xs">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-xs font-mono">
                                  {log.user_id ? log.user_id.slice(0, 8) : 'anon'}
                                </td>
                                <td className="px-6 py-3 max-w-xs truncate" title={q}>
                                  {q}
                                </td>
                                <td className="px-6 py-3 text-xs">
                                  {intent.city || filters.city || '—'}
                                </td>
                                <td className="px-6 py-3 text-xs">
                                  {intent.category || filters.category || '—'}
                                </td>
                                <td className="px-6 py-3 text-xs">
                                  {count}
                                </td>
                                <td className="px-6 py-3 text-xs">
                                  {source}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Drawer */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              setShowDrawer(false);
              setEditingDestination(null);
            }}
          />

          <div className="fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[800px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">
                {editingDestination ? 'Edit Destination' : 'Create New Destination'}
              </h2>
              <button
                onClick={() => {
                  setShowDrawer(false);
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
                onSave={handleSave}
                onCancel={() => {
                  setShowDrawer(false);
                  setEditingDestination(null);
                }}
                isSaving={isSaving}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
