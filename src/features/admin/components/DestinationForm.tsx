'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, X, Upload, Link2, Search, MapPin, Star, Crown, ChevronDown, ImageIcon,
  Globe, Phone, Instagram, ExternalLink, Building2, Compass, Calendar, Tag, DollarSign
} from 'lucide-react';
import { htmlToPlainText } from '@/lib/sanitize';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';

interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  safeError?: (error: unknown, fallbackMessage?: string) => void;
}

interface DestinationFormProps {
  destination?: Destination;
  onSave: (data: Partial<Destination>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: Toast;
}

type TabId = 'details' | 'location' | 'media' | 'content' | 'architecture' | 'booking' | 'data';

const CATEGORIES = [
  'Restaurant', 'Hotel', 'Bar', 'Cafe', 'Shopping', 'Museum', 'Gallery',
  'Landmark', 'Park', 'Beach', 'Spa', 'Club', 'Theater', 'Market', 'Others',
];

const PRICE_LEVELS = [
  { value: 1, label: '$ - Budget' },
  { value: 2, label: '$$ - Moderate' },
  { value: 3, label: '$$$ - Expensive' },
  { value: 4, label: '$$$$ - Very Expensive' },
];

interface DropdownOptions {
  cities: string[];
  countries: string[];
  neighborhoods: string[];
  brands: string[];
}

// Helper to normalize text to title case
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

export function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast,
}: DestinationFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [formData, setFormData] = useState({
    // Core fields
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    country: destination?.country || '',
    neighborhood: destination?.neighborhood || '',
    category: destination?.category || '',
    brand: destination?.brand || '',
    micro_description: destination?.micro_description || '',
    tags: destination?.tags || [],
    crown: destination?.crown || false,
    michelin_stars: destination?.michelin_stars || null,
    parent_destination_id: destination?.parent_destination_id || null,
    // Location
    latitude: destination?.latitude || null,
    longitude: destination?.longitude || null,
    formatted_address: destination?.formatted_address || '',
    // Media
    image: destination?.image || '',
    // Content
    description: htmlToPlainText(destination?.description || ''),
    content: destination?.content || '',
    editorial_summary: destination?.editorial_summary || '',
    // Architecture
    architect: destination?.architect || '',
    interior_designer: destination?.interior_designer || '',
    design_firm: destination?.design_firm || '',
    architectural_style: destination?.architectural_style || '',
    design_period: destination?.design_period || '',
    construction_year: destination?.construction_year || null,
    architectural_significance: destination?.architectural_significance || '',
    design_story: destination?.design_story || '',
    // Booking
    website: destination?.website || '',
    phone_number: destination?.phone_number || '',
    instagram_handle: destination?.instagram_handle || '',
    opentable_url: destination?.opentable_url || '',
    resy_url: destination?.resy_url || '',
    booking_url: destination?.booking_url || '',
    google_maps_url: destination?.google_maps_url || '',
    // Data (read-only but stored)
    rating: destination?.rating || null,
    price_level: destination?.price_level || null,
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showNeighborhoodDropdown, setShowNeighborhoodDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [customNeighborhoodInput, setCustomNeighborhoodInput] = useState('');
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
    cities: [],
    countries: [],
    neighborhoods: [],
    brands: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);

  // Helper to close all dropdowns
  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowCityDropdown(false);
    setShowCountryDropdown(false);
    setShowNeighborhoodDropdown(false);
    setShowBrandDropdown(false);
  };

  // Update form when destination changes
  useEffect(() => {
    if (destination) {
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        country: destination.country || '',
        neighborhood: destination.neighborhood || '',
        category: destination.category || '',
        brand: destination.brand || '',
        micro_description: destination.micro_description || '',
        tags: destination.tags || [],
        crown: destination.crown || false,
        michelin_stars: destination.michelin_stars || null,
        parent_destination_id: destination.parent_destination_id || null,
        latitude: destination.latitude || null,
        longitude: destination.longitude || null,
        formatted_address: destination.formatted_address || '',
        image: destination.image || '',
        description: htmlToPlainText(destination.description || ''),
        content: destination.content || '',
        editorial_summary: destination.editorial_summary || '',
        architect: destination.architect || '',
        interior_designer: destination.interior_designer || '',
        design_firm: destination.design_firm || '',
        architectural_style: destination.architectural_style || '',
        design_period: destination.design_period || '',
        construction_year: destination.construction_year || null,
        architectural_significance: destination.architectural_significance || '',
        design_story: destination.design_story || '',
        website: destination.website || '',
        phone_number: destination.phone_number || '',
        instagram_handle: destination.instagram_handle || '',
        opentable_url: destination.opentable_url || '',
        resy_url: destination.resy_url || '',
        booking_url: destination.booking_url || '',
        google_maps_url: destination.google_maps_url || '',
        rating: destination.rating || null,
        price_level: destination.price_level || null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);

      if (destination.parent_destination_id) {
        (async () => {
          try {
            const supabase = createClient({ skipValidation: true });
            const { data, error } = await supabase
              .from('destinations')
              .select('id, slug, name, city, category')
              .eq('id', destination.parent_destination_id)
              .single();
            if (!error && data) {
              setSelectedParent(data as Destination);
            }
          } catch {
            setSelectedParent(null);
          }
        })();
      } else {
        setSelectedParent(null);
      }
    } else {
      // Reset form for new destination
      setFormData({
        slug: '', name: '', city: '', country: '', neighborhood: '', category: '',
        brand: '', micro_description: '', tags: [], crown: false, michelin_stars: null,
        parent_destination_id: null, latitude: null, longitude: null, formatted_address: '',
        image: '', description: '', content: '', editorial_summary: '', architect: '',
        interior_designer: '', design_firm: '', architectural_style: '', design_period: '',
        construction_year: null, architectural_significance: '', design_story: '',
        website: '', phone_number: '', instagram_handle: '', opentable_url: '',
        resy_url: '', booking_url: '', google_maps_url: '', rating: null, price_level: null,
      });
      setImagePreview(null);
      setImageFile(null);
      setSelectedParent(null);
    }
  }, [destination]);

  // Fetch dropdown options from database
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const supabase = createClient({ skipValidation: true });
        const { data, error } = await supabase
          .from('destinations')
          .select('city, country, neighborhood, brand');

        if (error) throw error;

        // Extract unique non-empty values, normalize to title case, and sort alphabetically
        const cities = [...new Set(data?.map(d => d.city).filter(Boolean).map(toTitleCase) || [])].sort();
        const countries = [...new Set(data?.map(d => d.country).filter(Boolean).map(toTitleCase) || [])].sort();
        const neighborhoods = [...new Set(data?.map(d => d.neighborhood).filter(Boolean).map(toTitleCase) || [])].sort();
        const brands = [...new Set(data?.map(d => d.brand).filter(Boolean).map(toTitleCase) || [])].sort();

        setDropdownOptions({ cities, countries, neighborhoods, brands });
      } catch (error) {
        console.error('Error fetching dropdown options:', error);
      }
    };

    fetchDropdownOptions();
  }, []);

  // Search for parent destinations
  useEffect(() => {
    if (parentSearchQuery.trim()) {
      const timeoutId = setTimeout(() => searchParentDestinations(parentSearchQuery), 300);
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
        .is('parent_destination_id', null)
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

      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.safeError ? toast.safeError(error, 'Image upload failed') : toast.error('Image upload failed');
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
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: formData.name, city: formData.city }),
      });

      if (!res.ok) throw new Error('Failed to fetch from Google');
      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: htmlToPlainText(data.description || prev.description),
        content: data.content || prev.content,
        image: data.image || prev.image,
        formatted_address: data.formatted_address || prev.formatted_address,
        phone_number: data.phone_number || prev.phone_number,
        website: data.website || prev.website,
        rating: data.rating || prev.rating,
        price_level: data.price_level || prev.price_level,
        latitude: data.latitude || prev.latitude,
        longitude: data.longitude || prev.longitude,
      }));
      if (data.image) setImagePreview(data.image);
      toast.success('Auto-filled from Google Places');
    } catch (error) {
      console.error('Fetch Google error:', error);
      toast.safeError ? toast.safeError(error, 'Unable to fetch place details') : toast.error('Unable to fetch place details');
    } finally {
      setFetchingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
      else return;
    }

    const data: Partial<Destination> = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : undefined,
      construction_year: formData.construction_year ? Number(formData.construction_year) : null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      rating: formData.rating ? Number(formData.rating) : null,
      price_level: formData.price_level ? Number(formData.price_level) : null,
      parent_destination_id: selectedParent?.id || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
    };
    await onSave(data);
  };

  const handleEnrich = async () => {
    if (!formData.slug || !formData.name || !formData.city) {
      toast.warning('Please fill in name, slug, and city before enriching');
      return;
    }
    setIsEnriching(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          slug: formData.slug, name: formData.name, city: formData.city,
          category: formData.category, content: formData.content,
        }),
      });

      if (!response.ok) throw new Error('Enrichment failed');
      const result = await response.json();
      toast.success('Destination enriched with Google Places and AI data');

      if (result.data?.category) {
        setFormData(prev => ({ ...prev, category: result.data.category || prev.category }));
      }
    } catch (error) {
      console.error('Enrich error:', error);
      toast.safeError ? toast.safeError(error, 'Unable to enrich destination') : toast.error('Unable to enrich destination');
    } finally {
      setIsEnriching(false);
    }
  };

  const handlePlaceSelect = async (placeDetails: { placeId?: string }) => {
    if (!placeDetails.placeId) return;
    setFetchingGoogle(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ placeId: placeDetails.placeId }),
      });

      const data = await response.json();
      if (data.error) return;

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: htmlToPlainText(data.description || ''),
        content: data.content || prev.content,
        image: data.image || prev.image,
        formatted_address: data.formatted_address || prev.formatted_address,
        phone_number: data.phone_number || prev.phone_number,
        website: data.website || prev.website,
        latitude: data.latitude || prev.latitude,
        longitude: data.longitude || prev.longitude,
      }));
      if (data.image) setImagePreview(data.image);
      toast.success('Auto-filled from Google Places');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setFetchingGoogle(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'location', label: 'Location' },
    { id: 'media', label: 'Media' },
    { id: 'content', label: 'Content' },
    { id: 'architecture', label: 'Design' },
    { id: 'booking', label: 'Booking' },
    { id: 'data', label: 'Data' },
  ];

  const inputClasses = "w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-shadow";
  const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

  // Label with optional Required indicator
  const FieldLabel = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
    <div className="flex items-center justify-between mb-1.5">
      <span className={labelClasses.replace(' mb-1.5', '')}>{children}</span>
      {required && <span className="text-xs text-gray-400">Required</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <nav className="flex gap-0.5 px-1 min-w-max" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap",
                activeTab === tab.id
                  ? "text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="p-5 space-y-5">
            {/* Name with Google Places */}
            <div>
              <FieldLabel required>Name</FieldLabel>
              <div className="flex gap-2">
                <GooglePlacesAutocomplete
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Search for a place..."
                  className={cn(inputClasses, "flex-1")}
                  types="establishment"
                />
                <button
                  type="button"
                  onClick={fetchFromGoogle}
                  disabled={fetchingGoogle || !formData.name.trim()}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Fetch details from Google"
                >
                  {fetchingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Slug, City, Country */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel required>Slug</FieldLabel>
                <input type="text" required value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="url-slug" className={inputClasses} />
                {formData.slug && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                    <Link2 className="h-3 w-3" />
                    <span>urbanmanual.co/destination/{formData.slug}</span>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClasses}>City</label>
                <div className="relative">
                  <button type="button" onClick={() => { closeAllDropdowns(); setShowCityDropdown(!showCityDropdown); }}
                    className={cn(inputClasses, "text-left flex items-center justify-between")}>
                    <span className={formData.city ? "" : "text-gray-400"}>{formData.city || "Select city..."}</span>
                    <div className="flex items-center gap-1">
                      {formData.city && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, city: '' }); setCustomCityInput(''); }}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showCityDropdown && "rotate-180")} />
                    </div>
                  </button>
                  {showCityDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2">
                        <input type="text" value={customCityInput} onChange={(e) => setCustomCityInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && customCityInput.trim()) { e.preventDefault(); setFormData({ ...formData, city: toTitleCase(customCityInput.trim()) }); setShowCityDropdown(false); setCustomCityInput(''); } }}
                          placeholder="Type city or search..." className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
                        {customCityInput.trim() && (
                          <button type="button" onClick={() => { setFormData({ ...formData, city: toTitleCase(customCityInput.trim()) }); setShowCityDropdown(false); setCustomCityInput(''); }}
                            className="w-full text-left px-2 py-1.5 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                            Use "{toTitleCase(customCityInput.trim())}"
                          </button>
                        )}
                      </div>
                      {dropdownOptions.cities.filter(city => !customCityInput || city.toLowerCase().includes(customCityInput.toLowerCase())).map((city) => (
                        <button key={city} type="button" onClick={() => { setFormData({ ...formData, city }); setShowCityDropdown(false); setCustomCityInput(''); }}
                          className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800", formData.city === city && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClasses}>Country</label>
                <div className="relative">
                  <button type="button" onClick={() => { closeAllDropdowns(); setShowCountryDropdown(!showCountryDropdown); }}
                    className={cn(inputClasses, "text-left flex items-center justify-between")}>
                    <span className={formData.country ? "" : "text-gray-400"}>{formData.country || "Select country..."}</span>
                    <div className="flex items-center gap-1">
                      {formData.country && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, country: '' }); setCustomCountryInput(''); }}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showCountryDropdown && "rotate-180")} />
                    </div>
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2">
                        <input type="text" value={customCountryInput} onChange={(e) => setCustomCountryInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && customCountryInput.trim()) { e.preventDefault(); setFormData({ ...formData, country: toTitleCase(customCountryInput.trim()) }); setShowCountryDropdown(false); setCustomCountryInput(''); } }}
                          placeholder="Type country or search..." className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
                        {customCountryInput.trim() && (
                          <button type="button" onClick={() => { setFormData({ ...formData, country: toTitleCase(customCountryInput.trim()) }); setShowCountryDropdown(false); setCustomCountryInput(''); }}
                            className="w-full text-left px-2 py-1.5 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                            Use "{toTitleCase(customCountryInput.trim())}"
                          </button>
                        )}
                      </div>
                      {dropdownOptions.countries.filter(country => !customCountryInput || country.toLowerCase().includes(customCountryInput.toLowerCase())).map((country) => (
                        <button key={country} type="button" onClick={() => { setFormData({ ...formData, country }); setShowCountryDropdown(false); setCustomCountryInput(''); }}
                          className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800", formData.country === country && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                          {country}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Neighborhood, Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Neighborhood</label>
                <div className="relative">
                  <button type="button" onClick={() => { closeAllDropdowns(); setShowNeighborhoodDropdown(!showNeighborhoodDropdown); }}
                    className={cn(inputClasses, "text-left flex items-center justify-between")}>
                    <span className={formData.neighborhood ? "" : "text-gray-400"}>{formData.neighborhood || "Select neighborhood..."}</span>
                    <div className="flex items-center gap-1">
                      {formData.neighborhood && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, neighborhood: '' }); setCustomNeighborhoodInput(''); }}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showNeighborhoodDropdown && "rotate-180")} />
                    </div>
                  </button>
                  {showNeighborhoodDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2">
                        <input type="text" value={customNeighborhoodInput} onChange={(e) => setCustomNeighborhoodInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && customNeighborhoodInput.trim()) { e.preventDefault(); setFormData({ ...formData, neighborhood: toTitleCase(customNeighborhoodInput.trim()) }); setShowNeighborhoodDropdown(false); setCustomNeighborhoodInput(''); } }}
                          placeholder="Type neighborhood or search..." className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
                        {customNeighborhoodInput.trim() && (
                          <button type="button" onClick={() => { setFormData({ ...formData, neighborhood: toTitleCase(customNeighborhoodInput.trim()) }); setShowNeighborhoodDropdown(false); setCustomNeighborhoodInput(''); }}
                            className="w-full text-left px-2 py-1.5 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                            Use "{toTitleCase(customNeighborhoodInput.trim())}"
                          </button>
                        )}
                      </div>
                      {dropdownOptions.neighborhoods.filter(n => !customNeighborhoodInput || n.toLowerCase().includes(customNeighborhoodInput.toLowerCase())).map((neighborhood) => (
                        <button key={neighborhood} type="button" onClick={() => { setFormData({ ...formData, neighborhood }); setShowNeighborhoodDropdown(false); setCustomNeighborhoodInput(''); }}
                          className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800", formData.neighborhood === neighborhood && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                          {neighborhood}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClasses}>Brand</label>
                <div className="relative">
                  <button type="button" onClick={() => { closeAllDropdowns(); setShowBrandDropdown(!showBrandDropdown); }}
                    className={cn(inputClasses, "text-left flex items-center justify-between")}>
                    <span className={formData.brand ? "" : "text-gray-400"}>{formData.brand || "Select brand..."}</span>
                    <div className="flex items-center gap-1">
                      {formData.brand && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, brand: '' }); setCustomBrandInput(''); }}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showBrandDropdown && "rotate-180")} />
                    </div>
                  </button>
                  {showBrandDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {/* Custom brand input */}
                      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2">
                        <input
                          type="text"
                          value={customBrandInput}
                          onChange={(e) => setCustomBrandInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customBrandInput.trim()) {
                              e.preventDefault();
                              setFormData({ ...formData, brand: toTitleCase(customBrandInput.trim()) });
                              setShowBrandDropdown(false);
                              setCustomBrandInput('');
                            }
                          }}
                          placeholder="Type custom brand or search..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        {customBrandInput.trim() && (
                          <button type="button"
                            onClick={() => { setFormData({ ...formData, brand: toTitleCase(customBrandInput.trim()) }); setShowBrandDropdown(false); setCustomBrandInput(''); }}
                            className="w-full text-left px-2 py-1.5 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                            Use "{toTitleCase(customBrandInput.trim())}"
                          </button>
                        )}
                      </div>
                      {/* Existing brands from database */}
                      {dropdownOptions.brands.filter(brand => !customBrandInput || brand.toLowerCase().includes(customBrandInput.toLowerCase())).map((brand) => (
                        <button key={brand} type="button"
                          onClick={() => { setFormData({ ...formData, brand }); setShowBrandDropdown(false); setCustomBrandInput(''); }}
                          className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                            formData.brand === brand && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                          {brand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className={labelClasses}>Category</label>
              <div className="relative">
                <button type="button" onClick={() => { closeAllDropdowns(); setShowCategoryDropdown(!showCategoryDropdown); }}
                  className={cn(inputClasses, "text-left flex items-center justify-between")}>
                  <span className={formData.category ? "" : "text-gray-400"}>{formData.category || "Select..."}</span>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showCategoryDropdown && "rotate-180")} />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {CATEGORIES.map((cat) => (
                      <button key={cat} type="button"
                        onClick={() => { setFormData({ ...formData, category: cat }); setShowCategoryDropdown(false); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                          formData.category === cat && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Micro Description */}
            <div>
              <label className={labelClasses}>Micro Description</label>
              <input type="text" value={formData.micro_description}
                onChange={(e) => setFormData({ ...formData, micro_description: e.target.value })}
                placeholder="Short tagline for cards (50-100 chars)" className={inputClasses} maxLength={150} />
              <div className="mt-1 text-right text-xs text-gray-400">{formData.micro_description.length}/150</div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelClasses}>Tags</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag..." className={cn(inputClasses, "flex-1")} />
                <button type="button" onClick={addTag}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Tag className="h-4 w-4" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Parent Destination */}
            <div>
              <label className={labelClasses}>Parent Destination</label>
              <div className="relative">
                {selectedParent ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">{selectedParent.name}</div>
                        <div className="text-xs text-gray-500">{selectedParent.city}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSelectedParent(null); setFormData({ ...formData, parent_destination_id: null }); }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={parentSearchQuery} onChange={(e) => setParentSearchQuery(e.target.value)}
                      placeholder="Search parent venue..." className={cn(inputClasses, "pl-9")} />
                    {isSearchingParent && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                    {parentSearchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {parentSearchResults.map((parent) => (
                          <button key={parent.id} type="button"
                            onClick={() => { setSelectedParent(parent); setFormData({ ...formData, parent_destination_id: parent.id ?? null }); setParentSearchQuery(''); setParentSearchResults([]); }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="text-sm font-medium">{parent.name}</div>
                            <div className="text-xs text-gray-500">{parent.city} · {parent.category}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-3">
              <label className={labelClasses}>Badges & Recognition</label>
              {/* Michelin Stars */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Michelin Stars</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((stars) => (
                    <button key={stars} type="button"
                      onClick={() => { setFormData({ ...formData, michelin_stars: stars || null, category: stars > 0 ? 'Restaurant' : formData.category }); }}
                      className={cn("w-8 h-8 rounded-md text-sm font-medium transition-colors",
                        (formData.michelin_stars || 0) === stars
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700")}>
                      {stars}
                    </button>
                  ))}
                </div>
              </div>
              {/* Crown */}
              <button type="button" onClick={() => setFormData({ ...formData, crown: !formData.crown })}
                className={cn("w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                  formData.crown ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800")}>
                <div className="flex items-center gap-2">
                  <Crown className={cn("h-4 w-4", formData.crown ? "text-amber-500" : "text-gray-500")} />
                  <span className="text-sm">Featured (Crown)</span>
                </div>
                <div className={cn("w-10 h-6 rounded-full relative transition-colors",
                  formData.crown ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600")}>
                  <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    formData.crown ? "translate-x-5" : "translate-x-1")} />
                </div>
              </button>
            </div>

            {/* AI Enrichment */}
            {destination && (
              <div>
                <label className={labelClasses}>AI Enrichment</label>
                <button type="button" onClick={handleEnrich}
                  disabled={isEnriching || !formData.slug || !formData.name || !formData.city}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-md flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Enrich with AI</div>
                      <div className="text-xs text-gray-500">Fetch Google Places data & generate tags</div>
                    </div>
                  </div>
                  {isEnriching ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div className="p-5 space-y-5">
            <div>
              <label className={labelClasses}>Formatted Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={formData.formatted_address}
                  onChange={(e) => setFormData({ ...formData, formatted_address: e.target.value })}
                  placeholder="123 Main St, City, Country" className={cn(inputClasses, "pl-9")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Latitude</label>
                <div className="relative">
                  <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="number" step="any" value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="35.6762" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Longitude</label>
                <div className="relative">
                  <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="number" step="any" value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="139.6503" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
            </div>
            {formData.latitude && formData.longitude && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <a href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  View on Google Maps
                </a>
              </div>
            )}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="p-5 space-y-5">
            <div>
              <label className={labelClasses}>Image</label>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={cn("relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden",
                  isDragging ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700")}>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload-input" />
                <label htmlFor="image-upload-input" className="block cursor-pointer">
                  {imagePreview ? (
                    <div className="relative aspect-video">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Click to change</span>
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageFile(null); setImagePreview(null); setFormData({ ...formData, image: '' }); }}
                        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drop an image here</p>
                      <p className="text-xs text-gray-500">or click to browse</p>
                    </div>
                  )}
                </label>
              </div>
              {uploadingImage && <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>}
            </div>
            <div>
              <label className={labelClasses}>Or paste image URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="url" value={formData.image}
                  onChange={(e) => { setFormData({ ...formData, image: e.target.value }); if (!imageFile) setImagePreview(e.target.value || null); }}
                  placeholder="https://..." className={cn(inputClasses, "pl-9")} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setFormData({ ...formData, image: '' }); }}
                disabled={!imagePreview && !formData.image}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                Clear Image
              </button>
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <span className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <Upload className="h-4 w-4" />Upload New
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="p-5 space-y-5">
            <div>
              <label className={labelClasses}>Short Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3} className={cn(inputClasses, "resize-none")} placeholder="A brief description (1-2 sentences)" />
              <div className="mt-1 text-right text-xs text-gray-400">{formData.description.length} chars</div>
            </div>
            <div>
              <label className={labelClasses}>Content</label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Detailed description, what makes it special, atmosphere, best time to visit..."
              />
            </div>
            <div>
              <label className={labelClasses}>Editorial Summary</label>
              <textarea value={formData.editorial_summary} onChange={(e) => setFormData({ ...formData, editorial_summary: e.target.value })}
                rows={3} className={cn(inputClasses, "resize-none")} placeholder="Brief editorial summary" />
            </div>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Architect</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={formData.architect} onChange={(e) => setFormData({ ...formData, architect: e.target.value })}
                    placeholder="Tadao Ando" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Interior Designer</label>
                <input type="text" value={formData.interior_designer} onChange={(e) => setFormData({ ...formData, interior_designer: e.target.value })}
                  placeholder="Kelly Wearstler" className={inputClasses} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Design Firm</label>
                <input type="text" value={formData.design_firm} onChange={(e) => setFormData({ ...formData, design_firm: e.target.value })}
                  placeholder="Herzog & de Meuron" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Construction Year</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="number" min="1000" max="2100" value={formData.construction_year || ''}
                    onChange={(e) => setFormData({ ...formData, construction_year: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="2020" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Architectural Style</label>
                <input type="text" value={formData.architectural_style} onChange={(e) => setFormData({ ...formData, architectural_style: e.target.value })}
                  placeholder="Brutalism, Art Deco..." className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Design Period</label>
                <input type="text" value={formData.design_period} onChange={(e) => setFormData({ ...formData, design_period: e.target.value })}
                  placeholder="1960s, Contemporary..." className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Architectural Significance</label>
              <textarea value={formData.architectural_significance} onChange={(e) => setFormData({ ...formData, architectural_significance: e.target.value })}
                rows={3} className={cn(inputClasses, "resize-none")} placeholder="Why this matters architecturally..." />
            </div>
            <div>
              <label className={labelClasses}>Design Story</label>
              <textarea value={formData.design_story} onChange={(e) => setFormData({ ...formData, design_story: e.target.value })}
                rows={5} className={cn(inputClasses, "resize-y")} placeholder="Narrative about the design..." />
            </div>
          </div>
        )}

        {/* Booking Tab */}
        {activeTab === 'booking' && (
          <div className="p-5 space-y-5">
            <div>
              <label className={labelClasses}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com" className={cn(inputClasses, "pl-9")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+1 234 567 8900" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Instagram Handle</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={formData.instagram_handle} onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                    placeholder="username" className={cn(inputClasses, "pl-9")} />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClasses}>Google Maps URL</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="url" value={formData.google_maps_url} onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/..." className={cn(inputClasses, "pl-9")} />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
              <label className={cn(labelClasses, "mb-3")}>Reservation Links</label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">OpenTable</label>
                  <input type="url" value={formData.opentable_url} onChange={(e) => setFormData({ ...formData, opentable_url: e.target.value })}
                    placeholder="https://opentable.com/..." className={inputClasses} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resy</label>
                  <input type="url" value={formData.resy_url} onChange={(e) => setFormData({ ...formData, resy_url: e.target.value })}
                    placeholder="https://resy.com/..." className={inputClasses} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Other Booking URL</label>
                  <input type="url" value={formData.booking_url} onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                    placeholder="https://..." className={inputClasses} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Tab (Read-only enrichment) */}
        {activeTab === 'data' && (
          <div className="p-5 space-y-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500 mb-3">This data is typically populated from Google Places API enrichment.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Rating</label>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <input type="number" step="0.1" min="0" max="5" value={formData.rating || ''}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="4.5" className={inputClasses} />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Price Level</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select value={formData.price_level || ''}
                      onChange={(e) => setFormData({ ...formData, price_level: e.target.value ? parseInt(e.target.value) : null })}
                      className={cn(inputClasses, "pl-9")}>
                      <option value="">Not set</option>
                      {PRICE_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {destination && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Place ID</span>
                  <span className="font-mono text-xs">{destination.place_id || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">User Ratings Total</span>
                  <span>{destination.user_ratings_total?.toLocaleString() || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Views</span>
                  <span>{destination.views_count?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Saves</span>
                  <span>{destination.saves_count?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Last Enriched</span>
                  <span>{destination.last_enriched_at ? new Date(destination.last_enriched_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onCancel} disabled={isSaving}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isSaving}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> : destination ? 'Save Changes' : 'Create Destination'}
          </button>
        </div>
      </div>
    </form>
  );
}
