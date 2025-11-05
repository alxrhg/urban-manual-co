'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Edit, Search, X } from "lucide-react";
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
  const [placeRecommendations, setPlaceRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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
      // Create preview
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

      // Auto-fill form with fetched data
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: stripHtmlTags(data.description || prev.description),
        content: stripHtmlTags(data.content || prev.content),
        image: data.image || prev.image,
      }));

      // Update image preview if we got an image
      if (data.image) {
        setImagePreview(data.image);
      }

      // Show success message
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
    
    // Upload image if file selected
    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        // Don't submit if upload failed
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
      {/* Basic Information Section */}
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
                      // Get user email from session
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      if (!token) {
                        throw new Error('Not authenticated');
                      }
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
                      // Auto-fill form with Google data
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
                placeholder="Start typing a place name... (autocomplete enabled)"
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                types="establishment"
              />
              <button
                type="button"
                onClick={fetchFromGoogle}
                disabled={fetchingGoogle || !formData.name.trim()}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {fetchingGoogle ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />
                    Fetching...
                  </>
                ) : (
                  '🔍 Fetch Details'
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Type to see Google Places suggestions, or click "Fetch Details" to auto-fill all fields
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

      {/* Image Section */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Image</h3>
        <div className="space-y-3">
          {/* Drag and Drop Zone */}
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
                    title="Remove image"
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
          
          {/* Alternative: File Input Button */}
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload-button"
              />
              <span className="inline-flex items-center justify-center w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                📁 {imageFile ? 'Change Image' : 'Choose File'}
              </span>
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(formData.image || null);
                }}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Clear
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">or</div>
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
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {imagePreview && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                onError={() => setImagePreview(null)}
              />
            </div>
          )}
          {uploadingImage && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
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
              placeholder="A detailed description of the destination, what makes it special, atmosphere, best time to visit, etc."
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
              ⭐ Crown (Featured)
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="min-w-[100px] px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
              Saving...
            </>
          ) : destination ? (
            'Update Place'
          ) : (
            'Create Place'
          )}
        </button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [enrichLimit, setEnrichLimit] = useState(100);
  const [enrichOffset, setEnrichOffset] = useState(0);
  const [enrichSlug, setEnrichSlug] = useState('');
  const [enrichRunning, setEnrichRunning] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [enrichmentStats, setEnrichmentStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  
  // Regenerate content state
  const [regenerateRunning, setRegenerateRunning] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<any>(null);
  const [regenerateSlug, setRegenerateSlug] = useState('');
  const [regenerateLimit, setRegenerateLimit] = useState(10);
  const [regenerateOffset, setRegenerateOffset] = useState(0);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'destinations' | 'enrichment' | 'analytics' | 'searches'>('destinations');

  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState({
    totalViews: 0,
    totalSearches: 0,
    totalSaves: 0,
    totalUsers: 0,
    topSearches: [] as { query: string; count: number }[],
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Searches state
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);

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

  // Load enrichment statistics
  useEffect(() => {
    if (isAdmin && authChecked) {
      loadEnrichmentStats();
    }
  }, [isAdmin, authChecked]);

  // Load destination list when search or offset changes
  useEffect(() => {
    if (isAdmin && authChecked) {
      loadDestinationList();
    }
  }, [isAdmin, authChecked, listOffset, listSearchQuery]);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin || !authChecked) return;

    if (activeTab === 'analytics' && analyticsStats.totalUsers === 0) {
      loadAnalytics();
    } else if (activeTab === 'searches' && searchLogs.length === 0) {
      loadSearchLogs();
    }
  }, [activeTab, isAdmin, authChecked]);

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

  const loadEnrichmentStats = async () => {
    setIsLoadingStats(true);
    try {
      // Use select with all fields, but only request what exists (some columns might not exist yet)
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, google_place_id, formatted_address, international_phone_number, website, rating');
      
      if (error) {
        console.error('Supabase error:', error);
        // If columns don't exist, set empty stats
        setEnrichmentStats({
          total: 0,
          enriched: 0,
          withAddress: 0,
          withPhone: 0,
          withWebsite: 0,
          withRating: 0,
          needsEnrichment: 0,
          percentage: 0,
        });
        return;
      }
      
      const total = data?.length || 0;
      const enriched = data?.filter(d => d.google_place_id).length || 0;
      const withAddress = data?.filter(d => d.formatted_address).length || 0;
      const withPhone = data?.filter(d => d.international_phone_number).length || 0;
      const withWebsite = data?.filter(d => d.website).length || 0;
      const withRating = data?.filter(d => d.rating).length || 0;
      const needsEnrichment = data?.filter(d => !d.google_place_id || !d.formatted_address || !d.international_phone_number || !d.website).length || 0;
      
      setEnrichmentStats({
        total,
        enriched,
        withAddress,
        withPhone,
        withWebsite,
        withRating,
        needsEnrichment,
        percentage: total > 0 ? Math.round((enriched / total) * 100) : 0,
      });
    } catch (e: any) {
      console.error('Error loading stats:', e);
      // Set empty stats on error
      setEnrichmentStats({
        total: 0,
        enriched: 0,
        withAddress: 0,
        withPhone: 0,
        withWebsite: 0,
        withRating: 0,
        needsEnrichment: 0,
        percentage: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadDestinationList = async () => {
    setIsLoadingList(true);
    try {
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, google_place_id, formatted_address, rating')
        .order('slug', { ascending: true });

      // Apply search filter if present
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

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // Get user interactions stats
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('interaction_type');

      // Get visit history stats
      const { data: visits } = await supabase
        .from('visit_history')
        .select('destination_id, search_query');

      // Get user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Aggregate stats
      const views = interactions?.filter(i => i.interaction_type === 'view').length || 0;
      const searches = visits?.filter(v => v.search_query).length || 0;
      const saves = interactions?.filter(i => i.interaction_type === 'save').length || 0;

      // Top searches
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
      setLoadingAnalytics(false);
    }
  };

  const loadSearchLogs = async () => {
    setLoadingSearches(true);
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, interaction_type, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setSearchLogs(data || []);
    } catch (error) {
      console.error('Error loading search logs:', error);
      setSearchLogs([]);
    } finally {
      setLoadingSearches(false);
    }
  };

  const handleSearchDestinations = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (e: any) {
      setSearchResults([]);
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Show loading state
  if (!authChecked) {
    return (
      <main className="px-6 md:px-10 py-20">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="px-6 md:px-10 py-20 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header - Matches account page spacing and style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Admin</h1>
            <button
              onClick={() => router.push('/account')}
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Back to Account
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
        </div>

        {/* Tab Navigation - Matches account page style */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {['destinations', 'enrichment', 'analytics', 'searches'].map((tab) => (
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

        {/* Destinations Tab */}
        {activeTab === 'destinations' && (
          <div className="fade-in space-y-12">
            {/* Enrichment Statistics */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Enrichment Status</h2>
            <div className="flex gap-2">
              {enrichmentStats && enrichmentStats.needsEnrichment > 0 && (
                <button
                  onClick={async () => {
                        if (!user?.email || bulkEnriching) return;
                        setBulkEnriching(true);
                        setBulkProgress({ current: 0, total: enrichmentStats.needsEnrichment });
                        
                        try {
                          // Get all destinations that need enrichment
                          const { data: needsEnrichment } = await supabase
                            .from('destinations')
                            .select('slug')
                            .or('google_place_id.is.null,formatted_address.is.null,international_phone_number.is.null,website.is.null')
                            .order('slug', { ascending: true });
                          
                      if (!needsEnrichment || needsEnrichment.length === 0) {
                        alert('No destinations need enrichment');
                        return;
                      }
                      
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      if (!token) {
                        throw new Error('Not authenticated');
                      }
                      
                      let processed = 0;
                      let failed = 0;
                      const failures: Array<{ slug: string; reason: string }> = [];
                      const batchSize = 10; // Process 10 at a time
                          
                          for (let i = 0; i < needsEnrichment.length; i += batchSize) {
                            const batch = needsEnrichment.slice(i, i + batchSize);
                            
                            await Promise.all(
                              batch.map(async (dest: any) => {
                                try {
                                  const res = await fetch('/api/enrich-google', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ slug: dest.slug, limit: 1, offset: 0 })
                                  });
                                  const result = await res.json();
                                  if (result.results?.[0]?.ok) {
                                    processed++;
                                  } else {
                                    failed++;
                                    const reason = result.results?.[0]?.reason || result.results?.[0]?.error || 'unknown';
                                    failures.push({ slug: dest.slug, reason });
                                  }
                                } catch (e: any) {
                                  failed++;
                                  failures.push({ slug: dest.slug, reason: e?.message || 'network_error' });
                                  console.error(`Error enriching ${dest.slug}:`, e);
                                }
                                setBulkProgress({ current: processed + failed, total: needsEnrichment.length });
                              })
                            );
                            
                            // Small delay between batches to avoid rate limiting
                            if (i + batchSize < needsEnrichment.length) {
                              await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                          }
                          
                          // Show detailed results
                          const reasonCounts: Record<string, number> = {};
                          failures.forEach(f => {
                            reasonCounts[f.reason] = (reasonCounts[f.reason] || 0) + 1;
                          });
                          
                          const reasonSummary = Object.entries(reasonCounts)
                            .map(([reason, count]) => `  • ${reason}: ${count}`)
                            .join('\n');
                          
                          const message = `Bulk enrichment complete!\n\n` +
                            `✅ Enriched: ${processed}\n` +
                            `❌ Failed: ${failed}\n\n` +
                            `Failure reasons:\n${reasonSummary || '  (none)'}\n\n` +
                            `Most common issue: ${Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`;
                          
                          alert(message);
                          
                          // Log detailed failures to console
                          if (failures.length > 0) {
                            console.group('Failed Enrichments');
                            failures.slice(0, 50).forEach(f => {
                              console.log(`${f.slug}: ${f.reason}`);
                            });
                            if (failures.length > 50) {
                              console.log(`... and ${failures.length - 50} more`);
                            }
                            console.groupEnd();
                          }
                          // Refresh stats
                          await loadEnrichmentStats();
                          await loadDestinationList();
                        } catch (e: any) {
                          console.error('Bulk enrichment error:', e);
                          alert(`Error during bulk enrichment: ${e.message}`);
                        } finally {
                          setBulkEnriching(false);
                          setBulkProgress({ current: 0, total: 0 });
                    }
                  }}
                  disabled={bulkEnriching || !user?.email}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkEnriching ? (
                    <>
                      Enriching... ({bulkProgress.current}/{bulkProgress.total})
                    </>
                  ) : (
                    `Enrich All (${enrichmentStats.needsEnrichment})`
                  )}
                </button>
              )}
              <button
                onClick={loadEnrichmentStats}
                disabled={isLoadingStats}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingStats ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          {enrichmentStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{enrichmentStats.enriched}</div>
                <div className="text-xs text-gray-500">Enriched</div>
                <div className="text-xs text-gray-400 mt-1">{enrichmentStats.percentage}% of {enrichmentStats.total}</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{enrichmentStats.needsEnrichment}</div>
                <div className="text-xs text-gray-500">Needs Enrichment</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{enrichmentStats.withAddress}</div>
                <div className="text-xs text-gray-500">Have Address</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{enrichmentStats.withRating}</div>
                <div className="text-xs text-gray-500">Have Rating</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            </div>
          )}
        </div>

        {/* Destination List with Enrichment Status */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Destinations</h2>
            <button
              onClick={() => {
                setEditingDestination(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-xs font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Place
            </button>
          </div>
          <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={listSearchQuery}
                    onChange={(e) => {
                      setListSearchQuery(e.target.value);
                      setListOffset(0); // Reset to first page when searching
                    }}
                    placeholder="Search by name, city, slug, or category..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setListOffset(Math.max(0, listOffset - 20));
                }}
                disabled={listOffset === 0 || isLoadingList}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  setListOffset(listOffset + 20);
                }}
                disabled={isLoadingList || destinationList.length < 20}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <div>
          {isLoadingList ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : destinationList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No destinations found</div>
          ) : (
            <div className="space-y-2">
              {destinationList.map((dest: any) => {
                const isEnriched = !!dest.google_place_id;
                const hasAddress = !!dest.formatted_address;
                const hasRating = !!dest.rating;

                return (
                  <div
                    key={dest.slug}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{dest.name}</span>
                        <span className="text-xs text-gray-500">{dest.city}</span>
                        {isEnriched ? (
                          <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-medium">Enriched</span>
                        ) : (
                          <span className="text-xs bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">Not Enriched</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {hasAddress && <span className="text-green-600 dark:text-green-400">✓ Address</span>}
                        {hasRating && <span className="text-green-600 dark:text-green-400">✓ Rating: {dest.rating}</span>}
                        <span className="text-xs">Slug: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{dest.slug}</code></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDestination(dest);
                          setShowCreateModal(true);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEnrichSlug(dest.slug);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                      >
                        Enrich
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
        )}

        {/* Enrichment Tab */}
        {activeTab === 'enrichment' && (
          <div className="fade-in space-y-12">

        {/* Google Enrichment Tools */}
        <div className="mb-12">
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Google Enrichment</h2>
          <div className="space-y-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-4 block">
              Enrich destinations with Google Places API data.
              <br />
              <strong>Tip:</strong> If batch returns 0 results, all destinations may already be enriched. Try a specific slug to test or re-enrich a destination.
            </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={enrichSlug}
                  onChange={(e) => setEnrichSlug(e.target.value)}
                  placeholder="Destination slug (optional, recommended)"
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
                />
                <input
                  type="number"
                  value={enrichLimit}
                  onChange={(e) => setEnrichLimit(Number(e.target.value))}
                  placeholder="Limit (default: 100)"
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
                />
                <input
                  type="number"
                  value={enrichOffset}
                  onChange={(e) => setEnrichOffset(Number(e.target.value))}
                  placeholder="Offset (default: 0)"
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
                />
              </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              <strong>Batch mode:</strong> Finds destinations missing any enrichment data (google_place_id, formatted_address, phone, or website).
              If you get 0 results, try enriching a specific destination by slug.
            </div>

            {/* Search for slugs */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
              <span className="text-xs font-medium mb-2 block">Find Destination Slug</span>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchDestinations();
                    }
                  }}
                  placeholder="Search by name or city (e.g., 'tokyo', 'central park')"
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
                />
                <button
                  onClick={handleSearchDestinations}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {searchResults.map((d: any) => (
                      <button
                        key={d.slug}
                        onClick={() => {
                          setEnrichSlug(d.slug);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800"
                      >
                        <div className="font-medium">{d.name}</div>
                        <div className="text-gray-500">Slug: <code className="text-xs">{d.slug}</code> | City: {d.city}</div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <button
              onClick={async () => {
                  if (!user?.email) return;
                  setEnrichRunning(true);
                  setEnrichResult(null);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    if (!token) {
                      throw new Error('Not authenticated');
                    }
                    const res = await fetch('/api/enrich-google', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ slug: enrichSlug || undefined, limit: enrichLimit, offset: enrichOffset })
                    });
                    const j = await res.json();
                    setEnrichResult(j);
                  } catch (e: any) {
                    setEnrichResult({ error: e?.message || 'Failed to run enrichment' });
                  } finally {
                  setEnrichRunning(false);
                }
              }}
              disabled={enrichRunning || !user?.email}
              className="w-full sm:w-auto px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrichRunning ? 'Running...' : 'Run Enrichment'}
            </button>

            {enrichResult && (
              <div className="mt-4">
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-2xl overflow-auto max-h-[40vh] border border-gray-200 dark:border-gray-800">
                  {JSON.stringify(enrichResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Regenerate Content with AI */}
        <div className="mb-12">
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Regenerate Content with AI</h2>
          <div className="space-y-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Regenerate the "About" section for destinations using AI (Gemini) and all available Google Places API data.
              The AI will create engaging, informative descriptions using ratings, reviews, opening hours, and other enriched data.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">Slug (optional - leave empty for batch)</label>
                <input
                  type="text"
                  value={regenerateSlug}
                  onChange={(e) => setRegenerateSlug(e.target.value)}
                  placeholder="e.g., palace-hotel-tokyo"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                />
              </div>

            {!regenerateSlug && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Limit</label>
                    <input
                      type="number"
                      value={regenerateLimit}
                      onChange={(e) => setRegenerateLimit(Number(e.target.value))}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Offset</label>
                    <input
                      type="number"
                      value={regenerateOffset}
                      onChange={(e) => setRegenerateOffset(Number(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Processing {regenerateLimit} destinations starting from offset {regenerateOffset}.
                  Rate limited to 1 per second to avoid API limits.
                </div>
              </>
            )}

            <button
              onClick={async () => {
                if (!user?.email) return;
                setRegenerateRunning(true);
                setRegenerateResult(null);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const token = session?.access_token;
                  if (!token) {
                    throw new Error('Not authenticated');
                  }

                  const res = await fetch('/api/regenerate-content', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      slug: regenerateSlug || undefined,
                      limit: regenerateLimit,
                      offset: regenerateOffset
                    })
                  });
                  const j = await res.json();
                  setRegenerateResult(j);
                } catch (e: any) {
                  setRegenerateResult({ error: e?.message || 'Failed to regenerate content' });
                } finally {
                  setRegenerateRunning(false);
                }
              }}
              disabled={regenerateRunning || !user?.email}
              className="w-full sm:w-auto px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {regenerateRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                  Regenerating...
                </>
              ) : (
                `Regenerate Content ${regenerateSlug ? `(${regenerateSlug})` : `(${regenerateLimit} places)`}`
              )}
            </button>

            {regenerateResult && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium">
                  {regenerateResult.success !== undefined && (
                    <div className="mb-2">
                      <span className="text-green-600 dark:text-green-400">
                        ✅ Success: {regenerateResult.success}
                      </span>
                      {regenerateResult.failures > 0 && (
                        <span className="text-red-600 dark:text-red-400 ml-4">
                          ❌ Failures: {regenerateResult.failures}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-2xl overflow-auto max-h-[40vh] border border-gray-200 dark:border-gray-800">
                  {JSON.stringify(regenerateResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="fade-in space-y-12">
            {loadingAnalytics ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalViews.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Views</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalSearches.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Searches</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalSaves.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Saves</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Users</div>
                  </div>
                </div>

                {/* Top Searches */}
                {analyticsStats.topSearches.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Top Search Queries</h2>
                    <div className="space-y-2">
                      {analyticsStats.topSearches.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-2xl">
                          <span className="text-sm font-medium">{item.query}</span>
                          <span className="text-xs text-gray-500">{item.count} searches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Searches Tab */}
        {activeTab === 'searches' && (
          <div className="fade-in">
            {loadingSearches ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : searchLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No search logs available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2 pr-4 font-medium text-gray-500">Time</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">User</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Query</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">City</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Category</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Count</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLogs.map((log) => {
                      const q = log.metadata?.query || '';
                      const intent = log.metadata?.intent || {};
                      const filters = log.metadata?.filters || {};
                      const count = log.metadata?.count ?? '';
                      const source = log.metadata?.source || '';
                      return (
                        <tr key={log.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4">{log.user_id ? log.user_id.substring(0, 8) : 'anon'}</td>
                          <td className="py-2 pr-4 max-w-[360px] truncate" title={q}>{q}</td>
                          <td className="py-2 pr-4">{intent.city || filters.city || ''}</td>
                          <td className="py-2 pr-4">{intent.category || filters.category || ''}</td>
                          <td className="py-2 pr-4">{count}</td>
                          <td className="py-2 pr-4">{source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Drawer - Outside tabs, always available */}
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => {
                setShowCreateModal(false);
                setEditingDestination(null);
              }}
            />

            {/* Drawer */}
            <div
              className={`fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
                showCreateModal ? 'translate-x-0' : 'translate-x-full'
              } overflow-y-auto`}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold">
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

              {/* Content */}
              <div className="p-6">
                <DestinationForm
                  destination={editingDestination}
                  onSave={async (data) => {
                    setIsSaving(true);
                    try {
                      if (editingDestination) {
                        // Update existing
                        const { error } = await supabase
                          .from('destinations')
                          .update(data)
                          .eq('slug', editingDestination.slug);

                        if (error) throw error;
                      } else {
                        // Create new - generate slug if not provided
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
                      await loadEnrichmentStats();
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
  );
}
