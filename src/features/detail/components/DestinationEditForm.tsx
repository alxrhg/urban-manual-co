'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Trash2 } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import GooglePlacesAutocompleteNative from '@/components/GooglePlacesAutocompleteNative';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import { CategoryAutocompleteInput } from '@/components/CategoryAutocompleteInput';
import { ParentDestinationAutocompleteInput } from '@/components/ParentDestinationAutocompleteInput';
import { ArchitectTagInput } from '@/components/ArchitectTagInput';

interface DestinationEditFormProps {
  destination: Destination;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}

/**
 * DestinationEditForm - Admin form for editing destination details
 *
 * Includes:
 * - Google Places search for auto-fill
 * - Image upload with drag-and-drop
 * - All destination fields
 * - Delete confirmation
 */
export function DestinationEditForm({ destination, onCancel, onSave, onDelete }: DestinationEditFormProps) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    neighborhood: '',
    micro_description: '',
    description: '',
    content: '',
    image: '',
    michelin_stars: null as number | null,
    crown: false,
    brand: '',
    architects: [] as string[],
    interior_designer: '',
    architectural_style: '',
    website: '',
    instagram_handle: '',
    phone_number: '',
    opentable_url: '',
    resy_url: '',
    booking_url: '',
    parent_destination_id: null as number | null,
  });

  // Initialize form when destination changes
  useEffect(() => {
    if (destination) {
      const architectsArray = destination.architect
        ? destination.architect.split(',').map(a => a.trim()).filter(a => a)
        : [];

      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        neighborhood: destination.neighborhood || '',
        micro_description: destination.micro_description || '',
        description: destination.description || '',
        content: destination.content || '',
        image: destination.image || '',
        michelin_stars: destination.michelin_stars || null,
        crown: destination.crown || false,
        brand: destination.brand || '',
        architects: architectsArray,
        interior_designer: destination.interior_designer || '',
        architectural_style: destination.architectural_style || '',
        website: destination.website || '',
        instagram_handle: destination.instagram_handle || '',
        phone_number: destination.phone_number || '',
        opentable_url: destination.opentable_url || '',
        resy_url: destination.resy_url || '',
        booking_url: destination.booking_url || '',
        parent_destination_id: destination.parent_destination_id || null,
      });
      if (destination.image) setImagePreview(destination.image);
    }
  }, [destination]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
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
      reader.onloadend = () => setImagePreview(reader.result as string);
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
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formDataToSend,
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      return (await res.json()).url;
    } catch (error: any) {
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
      let imageUrl = formData.image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
        else { setIsSaving(false); return; }
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const destinationData = {
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: formData.name.trim(),
        city: formData.city.trim(),
        category: formData.category.trim(),
        neighborhood: formData.neighborhood?.trim() || null,
        micro_description: formData.micro_description?.trim() || null,
        description: formData.description?.trim() || null,
        content: formData.content?.trim() || null,
        image: imageUrl || null,
        michelin_stars: formData.michelin_stars || null,
        crown: formData.crown || false,
        brand: formData.brand?.trim() || null,
        architect: formData.architects.length > 0 ? formData.architects.join(', ') : null,
        interior_designer: formData.interior_designer?.trim() || null,
        architectural_style: formData.architectural_style?.trim() || null,
        website: formData.website?.trim() || null,
        instagram_handle: formData.instagram_handle?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        opentable_url: formData.opentable_url?.trim() || null,
        resy_url: formData.resy_url?.trim() || null,
        booking_url: formData.booking_url?.trim() || null,
        parent_destination_id: formData.parent_destination_id || null,
      };

      const { error } = await supabase.from('destinations').update(destinationData).eq('slug', destination.slug);

      if (error) {
        if (error.code === '23505') toast.error('A destination with this slug already exists');
        else throw error;
        return;
      }

      toast.success('Destination updated');
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!destination.slug) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('destinations').delete().eq('slug', destination.slug);
      if (error) throw error;
      toast.success('Destination deleted');
      onDelete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGooglePlaceSelect = async (placeDetails: any) => {
    const placeId = placeDetails?.place_id || placeDetails?.placeId;
    if (!placeId) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ placeId }),
      });

      if (!res.ok) throw new Error('Failed to fetch place details');
      const data = await res.json();

      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name ?? prev.name,
          city: data.city ?? prev.city,
          category: data.category ?? prev.category,
          description: data.description ?? prev.description,
          image: data.image ?? prev.image,
        }));
        if (data.image) setImagePreview(data.image);
        setGooglePlaceQuery('');
        toast.success('Place details loaded');
      }
    } catch (error) {
      toast.error('Failed to load place details');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Google Places Search */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Search Google Places</label>
        <GooglePlacesAutocompleteNative
          value={googlePlaceQuery}
          onChange={setGooglePlaceQuery}
          onPlaceSelect={handleGooglePlaceSelect}
          placeholder="Search Google Places..."
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          types={['establishment']}
        />
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="Place name"
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">City *</label>
        <CityAutocompleteInput
          value={formData.city}
          onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
          placeholder="City"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Category *</label>
        <CategoryAutocompleteInput
          value={formData.category}
          onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          placeholder="Category"
          required
        />
      </div>

      {/* Neighborhood */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Neighborhood</label>
        <input
          type="text"
          value={formData.neighborhood}
          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="e.g., Shibuya, SoHo"
        />
      </div>

      {/* Micro Description */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Micro Description</label>
        <input
          type="text"
          value={formData.micro_description}
          onChange={(e) => setFormData(prev => ({ ...prev, micro_description: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="One-line description for cards"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm resize-none"
          placeholder="Short description..."
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Image</label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
            isDragging ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="edit-image-upload" />
          <label htmlFor="edit-image-upload" className="flex flex-col items-center cursor-pointer">
            {imagePreview ? (
              <div className="relative w-full">
                <img src={imagePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImageFile(null);
                    setImagePreview(null);
                    setFormData(prev => ({ ...prev, image: '' }));
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Drop image or click to upload</span>
            )}
          </label>
        </div>
        {uploadingImage && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
          </div>
        )}
      </div>

      {/* Michelin Stars */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Michelin Stars</label>
        <select
          value={formData.michelin_stars || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, michelin_stars: e.target.value ? parseInt(e.target.value) : null }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
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
          type="checkbox"
          id="edit-crown"
          checked={formData.crown}
          onChange={(e) => setFormData(prev => ({ ...prev, crown: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="edit-crown" className="text-sm text-gray-600 dark:text-gray-400">Crown (Featured)</label>
      </div>

      {/* Brand */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Brand</label>
        <input
          type="text"
          value={formData.brand}
          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="e.g., Four Seasons, Aman"
        />
      </div>

      {/* Architects */}
      <ArchitectTagInput
        label="Architects"
        value={formData.architects}
        onChange={(architects) => setFormData(prev => ({ ...prev, architects }))}
        placeholder="Add architect..."
      />

      {/* Website */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="https://..."
        />
      </div>

      {/* Instagram Handle */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Instagram Handle</label>
        <input
          type="text"
          value={formData.instagram_handle}
          onChange={(e) => setFormData(prev => ({ ...prev, instagram_handle: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
          placeholder="@handle"
        />
      </div>

      {/* Parent Destination */}
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Located In (Parent)</label>
        <ParentDestinationAutocompleteInput
          value={formData.parent_destination_id}
          onChange={(id) => setFormData(prev => ({ ...prev, parent_destination_id: id }))}
          currentDestinationId={destination.id}
          placeholder="Search parent location..."
        />
      </div>

      {/* Delete Section */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">Delete "{destination.name}"?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-full text-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete Destination
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !formData.name || !formData.city || !formData.category}
          className="flex-1 bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
