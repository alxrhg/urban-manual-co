'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Drawer } from '@/components/ui/Drawer';
import { Loader2, X } from 'lucide-react';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { useToast } from '@/hooks/useToast';

interface POIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void; // Callback after successful save
}

export function POIDrawer({ isOpen, onClose, onSave }: POIDrawerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [googlePlaceQuery, setGooglePlaceQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    city: '',
    category: '',
    description: '',
    content: '',
    image: '',
    michelin_stars: null as number | null,
    crown: false,
  });

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (!isOpen) {
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
      setImageFile(null);
      setImagePreview(null);
    }
  }, [isOpen]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.category) {
      toast.error('Please fill in name, city, and category');
      return;
    }

    setIsSaving(true);
    try {
      // Upload image if file selected
      let imageUrl = formData.image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          // Don't submit if upload failed
          setIsSaving(false);
          return;
        }
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const destinationData = {
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: formData.name,
        city: formData.city,
        category: formData.category,
        description: formData.description || null,
        content: formData.content || null,
        image: imageUrl || null,
        michelin_stars: formData.michelin_stars || null,
        crown: formData.crown || false,
      };

      const { error } = await supabase
        .from('destinations')
        .insert([destinationData]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('A destination with this slug already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('POI created successfully');
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating POI:', error);
      toast.error(error.message || 'Failed to create POI');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGooglePlaceSelect = async (placeDetails: any) => {
    if (!placeDetails?.place_id) return;
    
    try {
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
        body: JSON.stringify({ placeId: placeDetails.place_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch place details');
      }

      const data = await response.json();
      
      if (data.place) {
        setFormData(prev => ({
          ...prev,
          name: data.place.name || prev.name,
          city: data.place.city || prev.city,
          category: data.place.category || prev.category,
          description: data.place.description || prev.description,
          image: data.place.image || prev.image,
          michelin_stars: data.place.michelin_stars || prev.michelin_stars,
        }));
        setGooglePlaceQuery('');
        toast.success('Place details loaded from Google');
      }
    } catch (error: any) {
      console.error('Error fetching Google place:', error);
      toast.error('Failed to load place details');
    }
  };

  const content = (
    <div className="px-6 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Google Places Autocomplete */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Search Google Places (optional)
          </label>
          <GooglePlacesAutocomplete
            value={googlePlaceQuery}
            onChange={setGooglePlaceQuery}
            onPlaceSelect={handleGooglePlaceSelect}
            placeholder="Search for a place on Google..."
          />
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            placeholder="Restaurant name"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Slug
          </label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            placeholder="auto-generated-from-name"
          />
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            City *
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            required
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            placeholder="Tokyo"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Category *
          </label>
          <input
            id="category"
            type="text"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            required
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            placeholder="Dining"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm resize-none"
            placeholder="Short description..."
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Content
          </label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            rows={6}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm resize-none"
            placeholder="Full content (markdown supported)..."
          />
        </div>

        {/* Image Section */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Image
          </label>
          
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors mb-3 ${
              isDragging
                ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
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
                    className="w-full h-48 object-cover rounded-xl mb-3"
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
          {!imagePreview && (
            <div className="flex items-center gap-2 mb-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload-button"
                />
                <span className="inline-flex items-center justify-center w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                  📁 Choose File
                </span>
              </label>
            </div>
          )}

          {/* Or URL Input */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">or</div>
          <input
            id="image"
            type="url"
            value={formData.image}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, image: e.target.value }));
              if (!imageFile && e.target.value) {
                setImagePreview(e.target.value);
              }
            }}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            placeholder="Enter image URL"
          />
          {imagePreview && formData.image && !imageFile && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-800"
                onError={() => setImagePreview(null)}
              />
            </div>
          )}
          {uploadingImage && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          )}
        </div>

        {/* Michelin Stars */}
        <div>
          <label htmlFor="michelin_stars" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Michelin Stars
          </label>
          <select
            id="michelin_stars"
            value={formData.michelin_stars || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, michelin_stars: e.target.value ? parseInt(e.target.value) : null }))}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
          >
            <option value="">None</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
          </select>
        </div>

        {/* Crown */}
        <div className="flex items-center gap-3">
          <input
            id="crown"
            type="checkbox"
            checked={formData.crown}
            onChange={(e) => setFormData(prev => ({ ...prev, crown: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-black dark:text-white focus:ring-black dark:focus:ring-white"
          />
          <label htmlFor="crown" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Crown (Featured destination)
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !formData.name || !formData.city || !formData.category}
            className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create POI'
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add New POI"
      desktopWidth="600px"
    >
      {content}
    </Drawer>
  );
}

