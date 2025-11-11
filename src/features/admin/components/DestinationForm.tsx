/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from './columns';

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
};

export type DestinationFormValues = {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string;
  content?: string;
  image?: string;
  michelin_stars?: number | null;
  crown?: boolean;
  parent_destination_id?: number | null;
};

interface DestinationFormProps {
  destination?: Destination | null;
  onSave: (data: DestinationFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: ToastApi;
}

type ParentResult = {
  id: number;
  slug: string;
  name: string;
  city: string;
  category?: string | null;
};

type PlaceSelection = {
  placeId?: string;
};

type PlaceRecommendation = {
  place_id?: string;
  name?: string;
  city?: string;
  category?: string;
  description?: string;
  content?: string;
  image?: string;
};

type GooglePlacePayload = {
  name?: string;
  city?: string;
  category?: string;
  description?: string;
  content?: string;
  image?: string;
  error?: string;
};

type FormState = {
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
};

export function DestinationForm({ destination, onSave, onCancel, isSaving, toast }: DestinationFormProps) {
  const [formData, setFormData] = useState<FormState>({
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
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<ParentResult[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentResult | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);
  const [placeRecommendations, setPlaceRecommendations] = useState<PlaceRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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
        crown: Boolean(destination.crown),
        parent_destination_id: destination.parent_destination_id || null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);

      if (destination.parent_destination_id) {
        void (async () => {
          try {
            const supabase = createClient();
            const { data } = await supabase
              .from('destinations')
              .select('id, slug, name, city')
              .eq('id', destination.parent_destination_id)
              .single();
            if (data) setSelectedParent(data as ParentResult);
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

  useEffect(() => {
    if (parentSearchQuery.trim()) {
      const timeoutId = window.setTimeout(() => {
        void searchParentDestinations(parentSearchQuery);
      }, 300);
      return () => window.clearTimeout(timeoutId);
    }
    setParentSearchResults([]);
    return undefined;
  }, [parentSearchQuery, searchParentDestinations]);

  const searchParentDestinations = useCallback(async (query: string) => {
    setIsSearchingParent(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category')
        .is('parent_destination_id', null)
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      setParentSearchResults((data || []) as ParentResult[]);
    } catch (error) {
      console.error('Error searching parent destinations:', error);
      setParentSearchResults([]);
    } finally {
      setIsSearchingParent(false);
    }
  }, []);

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
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image || null;

    setUploadingImage(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as Partial<{ error?: string }>;
        throw new Error(errorBody.error || 'Upload failed');
      }

      const data = (await res.json()) as Partial<{ url?: string }>;
      return data.url ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
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
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
        }),
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as Partial<{ error?: string }>;
        throw new Error(errorBody.error || 'Failed to fetch from Google');
      }

      const data = (await res.json()) as GooglePlacePayload;
      setFormData((prev) => ({
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

      toast.success(
        `Fetched data from Google Places! Name: ${data.name ?? formData.name}, City: ${data.city ?? formData.city}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Fetch Google error:', error);
      toast.error(`Failed to fetch from Google: ${message}`);
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

    const data: DestinationFormValues = {
      ...formData,
      image: imageUrl || undefined,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : null,
      parent_destination_id: selectedParent?.id || null,
    };
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name *</label>
            <div className="flex gap-2">
              <GooglePlacesAutocomplete
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                onPlaceSelect={async (placeDetails: PlaceSelection) => {
                  if (placeDetails.placeId) {
                    setFetchingGoogle(true);
                    try {
                      const supabase = createClient();
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      if (!token) {
                        throw new Error('Not authenticated');
                      }
                      const response = await fetch('/api/fetch-google-place', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ placeId: placeDetails.placeId }),
                      });
                      const data = (await response.json()) as GooglePlacePayload;
                      if (data.error) {
                        console.error('Error fetching place:', data.error);
                        return;
                      }
                      setFormData((prev) => ({
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
                    } catch (error: unknown) {
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
              💡 Type to see Google Places suggestions, or click &quot;Fetch Details&quot; to auto-fill all fields
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
                : 'border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
            }`}
          >
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload-input" />
            <label htmlFor="image-upload-input" className="flex flex-col items-center justify-center cursor-pointer">
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-800"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                      setFormData({ ...formData, image: '' });
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <div className="text-2xl mb-2">📸</div>
                  <p className="font-medium">Drag & drop an image</p>
                  <p className="text-xs mt-1">or click to browse</p>
                </div>
              )}
            </label>
            {uploadingImage && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/50 backdrop-blur flex items-center justify-center rounded-2xl">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Recommended size: 1200x900px. Supports JPG, PNG, and WebP.
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Short Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Concise summary for cards and previews"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description, highlights, history..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Michelin Stars</label>
              <input
                type="number"
                min={0}
                max={3}
                value={formData.michelin_stars ?? ''}
                onChange={(e) => setFormData({ ...formData, michelin_stars: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Crown Collection</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.crown}
                  onChange={(e) => setFormData({ ...formData, crown: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">Mark as crown destination</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generate similar places using Google Places and Gemini recommendations
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!formData.city) {
                toast.warning('Enter a city to generate recommendations');
                return;
              }
              setLoadingRecommendations(true);
              try {
                const response = await fetch(`/api/gemini-place-recommendations?city=${encodeURIComponent(formData.city)}`);
                const data = (await response.json()) as unknown;
                if (Array.isArray(data)) {
                  setPlaceRecommendations(data as PlaceRecommendation[]);
                } else {
                  throw new Error('Invalid response');
                }
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error('Recommendation error:', error);
                toast.error(`Failed to fetch recommendations: ${message}`);
              } finally {
                setLoadingRecommendations(false);
              }
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-500"
            disabled={loadingRecommendations}
          >
            {loadingRecommendations ? 'Loading...' : 'Generate Suggestions'}
          </button>
        </div>
        {placeRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {placeRecommendations.map((place, index) => (
              <button
                key={place.place_id || place.name || `recommendation-${index}`}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    name: place.name || prev.name,
                    city: place.city || prev.city,
                    category: place.category || prev.category,
                    description: stripHtmlTags(place.description || prev.description),
                    content: stripHtmlTags(place.content || prev.content),
                    image: place.image || prev.image,
                  }));
                  if (place.image) {
                    setImagePreview(place.image);
                  }
                }}
                className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-left hover:border-blue-500 transition-colors"
              >
                <div className="text-sm font-medium">{place.name}</div>
                <div className="text-xs text-gray-500">{place.city}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            No recommendations yet. Click the button above to generate suggestions.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
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
