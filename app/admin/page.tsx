'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { stripHtmlTags } from "@/lib/stripHtmlTags";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { DataTable } from "./data-table";
import { createColumns, type Destination as TableDestination } from "./columns";
import type { Destination } from '@/types/destination';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { capitalizeCity } from '@/lib/utils';

type AutocompleteSelection = {
  placeId?: string;
  place_id?: string;
  description?: string;
  name?: string;
  city?: string;
  address?: string;
};

type DestinationFormInput = Partial<Omit<Destination, 'michelin_stars' | 'parent_destination_id'>> & {
  michelin_stars?: number | null;
  parent_destination_id?: number | null;
};

interface DestinationFormState {
  slug: string;
  name: string;
  city: string;
  category: string;
  description: string;
  content: string;
  image: string;
  michelin_stars: number | null;
  crown: boolean;
  parent_destination_id: number | null;
}

const sanitizeTextField = (value?: string | null) =>
  typeof value === 'string' ? value.replace(/\u0000/g, '') : value ?? undefined;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Toast type
interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

// Destination Form Component
function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast
}: {
  destination?: DestinationFormInput | null;
  onSave: (data: DestinationFormInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: Toast;
}) {
  const [formData, setFormData] = useState<DestinationFormState>({
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    category: destination?.category || '',
    description: stripHtmlTags(destination?.description || ''),
    content: stripHtmlTags(destination?.content || ''),
    image: destination?.image || '',
    michelin_stars: destination?.michelin_stars ?? null,
    crown: destination?.crown || false,
    parent_destination_id: destination?.parent_destination_id ?? null,
  });
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<Destination[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Destination | null>(null);
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
        michelin_stars: destination.michelin_stars ?? null,
        crown: destination.crown || false,
        parent_destination_id: destination.parent_destination_id ?? null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);
      
      // Load parent destination if editing
      if (destination.parent_destination_id) {
        (async () => {
          try {
            const supabase = createClient({ skipValidation: true });
            const { data } = await supabase
              .from('destinations')
              .select('id, slug, name, city')
              .eq('id', destination.parent_destination_id)
              .single();
            if (data) setSelectedParent(data as unknown as Destination);
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
      const supabase = createClient({ skipValidation: true });
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

      const supabase = createClient({ skipValidation: true });
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
        let error;
        try {
          error = await res.json();
        } catch (parseError) {
          const text = await res.text();
          throw new Error(`Upload failed: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Upload failed');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(`Invalid response format: ${text || 'Unable to parse response'}`);
      }
      return data.url;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Upload error:', error);
      toast.error(`Image upload failed: ${message}`);
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
      const supabase = createClient({ skipValidation: true });
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
        let error;
        try {
          error = await res.json();
        } catch (parseError) {
          const text = await res.text();
          throw new Error(`Failed to fetch from Google: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Failed to fetch from Google');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(`Invalid response format: ${text || 'Unable to parse response'}`);
      }

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
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Fetch Google error:', error);
      toast.error(`Failed to fetch from Google: ${message}`);
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

    const payload: DestinationFormInput = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : null,
      parent_destination_id: selectedParent?.id || null,
    };
    await onSave(payload);
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
                onPlaceSelect={async (placeDetails: AutocompleteSelection) => {
                  if (placeDetails.placeId) {
                    setFetchingGoogle(true);
                    try {
                      // Get user email from session
                      const supabase = createClient({ skipValidation: true });
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
                      let data;
                      try {
                        data = await response.json();
                      } catch (parseError) {
                        const text = await response.text();
                        console.error('Error parsing response:', text);
                        toast.error('Invalid response format from Google Places API');
                        return;
                      }
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
                            setFormData({ ...formData, parent_destination_id: parent.id ?? null });
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
  const toast = useToast();
  const {
    isEditMode: inlineEditModeEnabled,
    enableEditMode: enableInlineEditMode,
    disableEditMode: disableInlineEditMode,
  } = useAdminEditMode();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [destinationList, setDestinationList] = useState<TableDestination[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    michelin: 0,
    crown: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationFormInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadAdminStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient({ skipValidation: true });

      const totalPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true });
      const enrichedPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .not('google_place_id', 'is', null);
      const michelinPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .gt('michelin_stars', 0);
      const crownPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('crown', true);

      const [totalRes, enrichedRes, michelinRes, crownRes] = await Promise.all([
        totalPromise,
        enrichedPromise,
        michelinPromise,
        crownPromise,
      ]);

      const responses = [totalRes, enrichedRes, michelinRes, crownRes];
      for (const res of responses) {
        if (res.error) {
          throw res.error;
        }
      }

      setStats({
        total: totalRes.count ?? 0,
        enriched: enrichedRes.count ?? 0,
        michelin: michelinRes.count ?? 0,
        crown: crownRes.count ?? 0,
      });
    } catch (error) {
      console.error('[Admin] Error loading stats:', error);
      toast.error('Failed to load admin stats');
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  const handleLaunchEditMode = useCallback((path: string) => {
    if (typeof window === 'undefined') return;
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    enableInlineEditMode();
    const url = formattedPath.includes('?') ? `${formattedPath}&edit=1` : `${formattedPath}?edit=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [enableInlineEditMode]);

  // Load destination list once on mount (client-side filtering/sorting handled by TanStack Table)
  const loadDestinationList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient({ skipValidation: true });
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('destinations')
        .select('count', { count: 'exact', head: true });
      
      if (testError) {
        console.error('[Admin] Connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown')
        .order('slug', { ascending: true });

      // Apply search filter if present
      if (listSearchQuery.trim()) {
        query = query.or(`name.ilike.%${listSearchQuery}%,city.ilike.%${listSearchQuery}%,slug.ilike.%${listSearchQuery}%,category.ilike.%${listSearchQuery}%`);
      }

        const { data, error } = await query.limit(200);

      if (error) {
        console.error('[Admin] Supabase error loading destinations:', error);
        // Safely stringify error to avoid JSON parse issues
        try {
          console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        } catch (stringifyError) {
          console.error('[Admin] Error details (raw):', error);
        }
        toast.error(`Failed to load destinations: ${error.message || 'Unknown error'}`);
        setDestinationList([]);
        return;
      }
       
      const destinationRows = (data ?? []) as TableDestination[];

      // Sanitize data to prevent JSON parse errors from malformed content
      const sanitizedData = destinationRows.map((item) => ({
        ...item,
        description: sanitizeTextField(item.description),
        content: sanitizeTextField(item.content),
      }));
      
      setDestinationList(sanitizedData);
      
      if (sanitizedData.length === 0 && !listSearchQuery.trim()) {
        toast.warning('No destinations found in database. Add some destinations to get started.');
      }
    } catch (error) {
      console.error('[Admin] Error loading destinations:', error);
      const message = getErrorMessage(error);
      // Check if it's a JSON parse error
      if (message.includes('JSON') || message.includes('parse') || error instanceof SyntaxError) {
        toast.error('Failed to load destinations: Invalid data format. Some destinations may have corrupted content.');
      } else {
        toast.error(`Error loading destinations: ${message}`);
      }
      setDestinationList([]);
    } finally {
      setIsLoadingList(false);
    }
    }, [listSearchQuery, toast]);

  // Load destinations when admin/auth is ready, or when search/offset changes
  useEffect(() => {
    loadDestinationList();
  }, [loadDestinationList]);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  // Load data when tab changes
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
            const supabase = createClient({ skipValidation: true });
            const { error } = await supabase
              .from('destinations')
              .delete()
              .eq('slug', slug);

            if (error) throw error;

            // Reload the list after deletion
            await loadDestinationList();
            await loadAdminStats();

          toast.success(`Successfully deleted "${name}"`);
        } catch (error) {
          const message = getErrorMessage(error);
          console.error('Delete error:', error);
          toast.error(`Failed to delete: ${message}`);
        }
      }
    });
  };

  const inlineCitySlug = destinationList[0]?.city || 'tokyo';
  const inlineCityLabel = capitalizeCity(inlineCitySlug);

  // Show loading state
  return (
    <div className="space-y-10 text-sm">
      <section className="space-y-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Stats</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Live counts pulled directly from Supabase.
          </p>
          <dl className="space-y-1">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500 dark:text-gray-400">Destinations</dt>
              <dd className="font-mono">{statsLoading ? '…' : stats.total.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500 dark:text-gray-400">Google enriched</dt>
              <dd className="font-mono">{statsLoading ? '…' : stats.enriched.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500 dark:text-gray-400">Michelin spots</dt>
              <dd className="font-mono">{statsLoading ? '…' : stats.michelin.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500 dark:text-gray-400">Crown picks</dt>
              <dd className="font-mono">{statsLoading ? '…' : stats.crown.toLocaleString()}</dd>
            </div>
          </dl>
          <button
            onClick={() => loadAdminStats()}
            disabled={statsLoading}
            className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 disabled:opacity-50"
          >
            <Loader2 className={`h-3 w-3 ${statsLoading ? 'animate-spin' : 'hidden'}`} />
            Refresh stats
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Inline editing</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Toggle edit affordances on the live site. Changes sync straight to Supabase.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleLaunchEditMode('/')}
              className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Open homepage
            </button>
            <button
              onClick={() => handleLaunchEditMode(`/city/${inlineCitySlug}`)}
              className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Edit {inlineCityLabel}
            </button>
            {inlineEditModeEnabled ? (
              <button
                onClick={disableInlineEditMode}
                className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Turn off
              </button>
            ) : (
              <button
                onClick={enableInlineEditMode}
                className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Enable now
              </button>
            )}
            <Link
              href="/admin/discover"
              className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Go to Discover
            </Link>
          </div>
          {inlineEditModeEnabled && (
            <p className="text-xs text-amber-800 dark:text-amber-200 italic">
              Edit mode is active. Use the edit badge on any destination card to make changes in place.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Destinations</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search, edit, or delete any record in the catalog.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDestination(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-100"
            >
              <Plus className="h-4 w-4" />
              Add place
            </button>
          </div>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading destinations…
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
              onSearchChange={setListSearchQuery}
              isLoading={isLoadingList}
            />
          )}
        </div>
      </section>

      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
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
              <h2 className="text-xl font-bold">
                {editingDestination ? 'Edit Destination' : 'Create New Destination'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDestination(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
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
                        .insert([data]);
                      if (error) throw error;
                    }

                    setShowCreateModal(false);
                    setEditingDestination(null);
                    await loadDestinationList();
                    await loadAdminStats();
                    toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
                  } catch (error) {
                    toast.error(`Error: ${getErrorMessage(error)}`);
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
    </div>
  );
}
