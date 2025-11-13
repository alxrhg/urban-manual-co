'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Edit, Search, X, Trash2, RefreshCcw, Sparkles, Layers, Users, Bookmark } from "lucide-react";
import { stripHtmlTags } from "@/lib/stripHtmlTags";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { DataTable } from "./data-table";
import { createColumns, type Destination } from "./columns";
import DiscoverTab from '@/components/admin/DiscoverTab';
import { AdminGrid, GridSection, GridCard, GridCardHeader, GridCardBody, GridCardFooter } from "@/src/components/admin/layout";
import { AdminStatCard } from "@/src/components/admin/stat-card";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type AdminTab = 'destinations' | 'analytics' | 'searches' | 'discover';

// Destination Form Component
function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast
}: {
  destination?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: any;
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
    parent_destination_id: destination?.parent_destination_id || null,
  });
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);
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
        parent_destination_id: destination.parent_destination_id || null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);
      
      // Load parent destination if editing
      if (destination.parent_destination_id) {
        (async () => {
          try {
            const supabase = createClient();
            const { data } = await supabase
              .from('destinations')
              .select('id, slug, name, city')
              .eq('id', destination.parent_destination_id)
              .single();
            if (data) setSelectedParent(data);
          } catch {
            setSelectedParent(null);
          }
        })();
      } else {
        setSelectedParent(null);
      }
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
        parent_destination_id: null,
      });
      setImagePreview(null);
      setImageFile(null);
      setSelectedParent(null);
    }
  }, [destination]);

  // Search for parent destinations
  useEffect(() => {
    if (parentSearchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchParentDestinations(parentSearchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setParentSearchResults([]);
    }
  }, [parentSearchQuery]);

  const searchParentDestinations = async (query: string) => {
    setIsSearchingParent(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category')
        .is('parent_destination_id', null) // Only top-level destinations can be parents
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      setParentSearchResults(data || []);
    } catch (error) {
      console.error('Error searching parent destinations:', error);
      setParentSearchResults([]);
    } finally {
      setIsSearchingParent(false);
    }
  };

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

      const supabase = createClient();
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
      toast.error(`Image upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchFromGoogle = async () => {
    if (!formData.name.trim()) {
      toast.warning('Please enter a name first');
      return;
    }

    setFetchingGoogle(true);
    try {
      const supabase = createClient();
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
      toast.success(`Fetched data from Google Places! Name: ${data.name}, City: ${data.city}`);
    } catch (error: any) {
      console.error('Fetch Google error:', error);
      toast.error(`Failed to fetch from Google: ${error.message}`);
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
      parent_destination_id: selectedParent?.id || null,
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
                      const supabase = createClient();
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
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                types="establishment"
              />
              <button
                type="button"
                onClick={fetchFromGoogle}
                disabled={fetchingGoogle || !formData.name.trim()}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., restaurant, hotel, cafe"
            />
          </div>
          
          {/* Parent Destination Selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Parent Destination (Optional)</label>
            <div className="relative">
              {selectedParent ? (
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800">
                  <div>
                    <span className="text-sm font-medium">{selectedParent.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{selectedParent.city}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParent(null);
                      setFormData({ ...formData, parent_destination_id: null });
                    }}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    placeholder="Search for parent destination (e.g., hotel name)..."
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isSearchingParent && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  {parentSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {parentSearchResults.map((parent) => (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() => {
                            setSelectedParent(parent);
                            setFormData({ ...formData, parent_destination_id: parent.id });
                            setParentSearchQuery('');
                            setParentSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-dark-blue-700 transition-colors"
                        >
                          <div className="font-medium text-sm">{parent.name}</div>
                          <div className="text-xs text-gray-500">{parent.city} • {parent.category}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a parent destination if this venue is located within another (e.g., a bar within a hotel)
            </div>
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
                : 'border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
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
              <span className="inline-flex items-center justify-center w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
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
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {imagePreview && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
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
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="A brief, punchy description (1-2 sentences)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
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
              onChange={(e) => {
                const michelinStars = e.target.value ? Number(e.target.value) : null;
                const updatedFormData = { ...formData, michelin_stars: michelinStars };
                // If Michelin stars are set, ensure category is 'Restaurant'
                if (michelinStars && michelinStars > 0) {
                  updatedFormData.category = 'Restaurant';
                }
                setFormData(updatedFormData);
              }}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
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
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
  const toast = useToast();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  
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
  const [activeTab, setActiveTab] = useState<AdminTab>('destinations');

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
      const supabase = createClient();
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

  // Load destination list once on mount (client-side filtering/sorting handled by TanStack Table)
  const loadDestinationList = useCallback(async () => {
    if (!isAdmin || !authChecked) return;
    
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown')
        .order('slug', { ascending: true });

      // Apply search filter if present
      if (listSearchQuery.trim()) {
        query = query.or(`name.ilike.%${listSearchQuery}%,city.ilike.%${listSearchQuery}%,slug.ilike.%${listSearchQuery}%,category.ilike.%${listSearchQuery}%`);
      }

      const { data, error } = await query.range(listOffset, listOffset + 19);

      if (error) {
        console.error('[Admin] Supabase error loading destinations:', error);
        console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to load destinations: ${error.message}`);
        setDestinationList([]);
        return;
      }
      
      console.log('[Admin] Loaded destinations:', data?.length || 0);
      setDestinationList(data || []);
    } catch (e: any) {
      console.error('[Admin] Error loading destinations:', e);
      toast.error(`Error loading destinations: ${e.message || 'Unknown error'}`);
      setDestinationList([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [isAdmin, authChecked, listSearchQuery, listOffset, toast]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const supabase = createClient();
      // Get user interactions stats
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('interaction_type, created_at');

      if (interactions) {
        const views = interactions.filter(i => i.interaction_type === 'view').length;
        const searches = interactions.filter(i => i.interaction_type === 'search').length;
        const saves = interactions.filter(i => i.interaction_type === 'save').length;

        // Get unique users
        const { data: users } = await supabase
          .from('user_interactions')
          .select('user_id')
          .not('user_id', 'is', null);

        const uniqueUsers = new Set((users || []).map((u: any) => u.user_id));
        
        // Get top searches
        const searchInteractions = interactions.filter(i => i.interaction_type === 'search');
        const searchCounts = new Map<string, number>();
        searchInteractions.forEach((i: any) => {
          const query = i.metadata?.query || 'Unknown';
          searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
        });

        const topSearches = Array.from(searchCounts.entries())
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setAnalyticsStats({
          totalViews: views,
          totalSearches: searches,
          totalSaves: saves,
          totalUsers: uniqueUsers.size,
          topSearches,
        });
      }
    } catch (error) {
      console.error('[Admin] Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [toast]);

  const loadSearchLogs = useCallback(async () => {
    setLoadingSearches(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, interaction_type, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSearchLogs(data || []);
    } catch (error) {
      console.error('[Admin] Error loading search logs:', error);
      toast.error('Failed to load search logs');
      setSearchLogs([]);
    } finally {
      setLoadingSearches(false);
    }
  }, [toast]);

  // Load destinations when admin/auth is ready, or when search/offset changes
  useEffect(() => {
    if (isAdmin && authChecked) {
      // Reset offset when search query changes
      if (listSearchQuery !== '' && listOffset !== 0) {
        setListOffset(0);
        return; // Will trigger another effect run with offset=0
      }
      loadDestinationList();
    }
  }, [isAdmin, authChecked, listSearchQuery, listOffset, loadDestinationList]);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin || !authChecked) return;

    if (activeTab === 'analytics' && analyticsStats.totalUsers === 0) {
      loadAnalytics();
    } else if (activeTab === 'searches' && searchLogs.length === 0) {
      loadSearchLogs();
    }
  }, [activeTab, isAdmin, authChecked, analyticsStats.totalUsers, searchLogs.length, loadAnalytics, loadSearchLogs]);

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

  const handleDeleteDestination = (slug: string, name: string) => {
    confirm({
      title: 'Delete Destination',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('destinations')
            .delete()
            .eq('slug', slug);

          if (error) throw error;

          // Reload the list after deletion
          await loadDestinationList();

          toast.success(`Successfully deleted "${name}"`);
        } catch (e: any) {
          console.error('Delete error:', e);
          toast.error(`Failed to delete: ${e.message}`);
        }
      }
    });
  };

  const handleSearchDestinations = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const supabase = createClient();
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

  const tabDetails: Record<AdminTab, { title: string; description: string }> = {
    destinations: {
      title: 'Destinations grid',
      description: 'Review, enrich, and publish curated venues.',
    },
    analytics: {
      title: 'Signals & analytics',
      description: 'Monitor engagement events flowing into Supabase.',
    },
    searches: {
      title: 'Search telemetry',
      description: 'Audit real user queries with contextual metadata.',
    },
    discover: {
      title: 'Discover experiments',
      description: 'Prototype AI surfaced destinations in real time.',
    },
  };

  const heroStats = [
    {
      label: 'Destinations loaded',
      value: isLoadingList ? '…' : destinationList.length.toLocaleString(),
      hint: listSearchQuery ? 'Filtered snapshot' : 'Current batch (20 rows)',
      icon: <Layers className="h-8 w-8 text-slate-400" />,
    },
    {
      label: 'Search logs cached',
      value: searchLogs.length.toLocaleString(),
      hint: 'Last 100 interactions',
      icon: <Search className="h-8 w-8 text-slate-400" />,
    },
    {
      label: 'Unique users tracked',
      value: analyticsStats.totalUsers ? analyticsStats.totalUsers.toLocaleString() : '—',
      hint: 'From user_interactions',
      icon: <Users className="h-8 w-8 text-slate-400" />,
    },
    {
      label: 'Saves recorded',
      value: analyticsStats.totalSaves ? analyticsStats.totalSaves.toLocaleString() : '—',
      hint: 'All time saves',
      icon: <Bookmark className="h-8 w-8 text-slate-400" />,
    },
  ];

  const quickActions = [
    {
      label: 'Add destination',
      description: 'Open the editor drawer with a blank form.',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        setEditingDestination(null);
        setShowCreateModal(true);
      },
    },
    {
      label: 'Refresh grid',
      description: 'Pull the latest snapshot from Supabase.',
      icon: <RefreshCcw className="h-4 w-4" />,
      action: () => {
        void loadDestinationList();
      },
    },
    {
      label: activeTab === 'discover' ? 'Back to destinations' : 'Open discover',
      description: activeTab === 'discover'
        ? 'Return to the operational grid.'
        : 'Jump into the AI-driven Discover lab.',
      icon: <Sparkles className="h-4 w-4" />,
      action: () => {
        setActiveTab(activeTab === 'discover' ? 'destinations' : 'discover');
      },
    },
  ];

  const tabOptions: AdminTab[] = ['destinations', 'analytics', 'searches', 'discover'];

  // Show loading state
  if (!authChecked) {
    return (
      <main className="px-6 md:px-10 py-20">
        <div className="container mx-auto flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100/70 pb-16 pt-12 dark:bg-slate-950">
      <AdminGrid>
        <GridSection className="mb-10">
          <GridCard tone="transparent" className="border-none shadow-none">
            <GridCardBody className="px-0">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Control room</p>
                  <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Admin grid</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Operate destinations, analytics, and discovery tooling from a single staggered grid layout.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 text-xs text-slate-500">
                  <span className="rounded-full bg-black px-4 py-1 text-white dark:bg-white dark:text-black">Admin</span>
                  <span>{user?.email}</span>
                  <button
                    onClick={() => router.push('/account')}
                    className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-600 underline decoration-dotted"
                  >
                    Back to account
                  </button>
                </div>
              </div>
            </GridCardBody>
          </GridCard>
        </GridSection>

        <GridSection className="mb-10">
          {heroStats.map((stat) => (
            <AdminStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              icon={stat.icon}
              span={{ base: 12, md: 6, lg: 3 }}
            />
          ))}
        </GridSection>

        <GridSection className="mb-10">
          <GridCard span={{ base: 12, md: 5 }}>
            <GridCardHeader>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Quick actions</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Keep the grid flowing</p>
            </GridCardHeader>
            <GridCardBody className="space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 px-4 py-3 text-left transition hover:border-black dark:border-slate-800/80"
                >
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-slate-200">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-white">
                    {action.icon}
                  </div>
                </button>
              ))}
            </GridCardBody>
          </GridCard>
          <GridCard span={{ base: 12, md: 7 }}>
            <GridCardHeader>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Modules</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Choose a lane</p>
            </GridCardHeader>
            <GridCardBody>
              <div className="flex flex-wrap gap-3">
                {tabOptions.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] transition ${
                      activeTab === tab
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{tabDetails[activeTab].description}</p>
            </GridCardBody>
          </GridCard>
        </GridSection>

        <GridSection>
          <GridCard span={{ base: 12 }}>
            <GridCardHeader className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Active module</p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{tabDetails[activeTab].title}</h2>
              </div>
              {activeTab === 'destinations' && (
                <button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:opacity-80 dark:bg-white dark:text-black"
                >
                  <Plus className="h-4 w-4" /> New place
                </button>
              )}
              {activeTab === 'analytics' && (
                <button
                  onClick={() => void loadAnalytics()}
                  className="rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-black dark:border-slate-700 dark:text-slate-200"
                >
                  Refresh stats
                </button>
              )}
            </GridCardHeader>
            <GridCardBody>
              {activeTab === 'destinations' && (
                <div className="space-y-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Use the grid below to search, filter, and edit destinations. Column actions stay inline for speed.
                  </p>
                  {isLoadingList ? (
                    <div className="flex items-center justify-center py-10 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <DataTable
                      columns={createColumns(
                        (dest) => {
                          setEditingDestination(dest);
                          setShowCreateModal(true);
                        },
                        handleDeleteDestination
                      )}
                      data={destinationList}
                      searchQuery={listSearchQuery}
                      onSearchChange={(query) => {
                        setListSearchQuery(query);
                      }}
                      isLoading={isLoadingList}
                    />
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  {loadingAnalytics ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Views</p>
                          <p className="text-2xl font-semibold">{analyticsStats.totalViews.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Searches</p>
                          <p className="text-2xl font-semibold">{analyticsStats.totalSearches.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Saves</p>
                          <p className="text-2xl font-semibold">{analyticsStats.totalSaves.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Users</p>
                          <p className="text-2xl font-semibold">{analyticsStats.totalUsers.toLocaleString()}</p>
                        </div>
                      </div>
                      {analyticsStats.topSearches.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Top search queries</p>
                          <div className="grid gap-2">
                            {analyticsStats.topSearches.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-2xl border border-slate-200/70 px-4 py-3 text-sm dark:border-slate-800"
                              >
                                <span className="font-medium text-slate-900 dark:text-white">{item.query}</span>
                                <span className="text-xs text-slate-500">{item.count} searches</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'searches' && (
                <div className="space-y-4">
                  {loadingSearches ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : searchLogs.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/70 px-4 py-6 text-center text-slate-500 dark:border-slate-800">
                      No search logs available
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800">
                      <table className="w-full min-w-[720px] text-xs">
                        <thead className="bg-slate-50/80 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                          <tr>
                            <th className="py-3 pr-4 text-left">Time</th>
                            <th className="py-3 pr-4 text-left">User</th>
                            <th className="py-3 pr-4 text-left">Query</th>
                            <th className="py-3 pr-4 text-left">City</th>
                            <th className="py-3 pr-4 text-left">Category</th>
                            <th className="py-3 pr-4 text-left">Count</th>
                            <th className="py-3 pr-4 text-left">Source</th>
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
                              <tr
                                key={log.id}
                                className="border-b border-slate-100 text-slate-700 last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/40"
                              >
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

              {activeTab === 'discover' && (
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <DiscoverTab />
                </div>
              )}
            </GridCardBody>
            <GridCardFooter>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">
                {destinationList.length} rows in current window
              </div>
              <div className="text-xs text-slate-500">
                Authenticated as {user?.email}
              </div>
            </GridCardFooter>
          </GridCard>
        </GridSection>
      </AdminGrid>

      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => {
              setShowCreateModal(false);
              setEditingDestination(null);
            }}
          />
          <div
            className={`fixed right-0 top-0 z-50 h-full w-full transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-950 sm:w-[600px] lg:w-[700px] ${
              showCreateModal ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-xl font-bold">
                {editingDestination ? 'Edit Destination' : 'Create New Destination'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDestination(null);
                }}
                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <DestinationForm
                destination={editingDestination}
                toast={toast}
                onSave={async (data) => {
                  setIsSaving(true);
                  try {
                    if (data.name) {
                      const nameLower = data.name.toLowerCase();
                      if (nameLower.startsWith('apple') || nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
                        data.category = 'Shopping';
                      }
                    }
                    if (data.michelin_stars && data.michelin_stars > 0) {
                      data.category = 'Restaurant';
                    }

                    const supabase = createClient();
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
                        .insert([data] as any);

                      if (error) throw error;
                    }

                    setShowCreateModal(false);
                    setEditingDestination(null);
                    await loadDestinationList();
                    toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
                  } catch (e: any) {
                    toast.error(`Error: ${e.message}`);
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

      <ConfirmDialogComponent />
    </main>
  );
}
