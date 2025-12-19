'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, X, Upload, Link2, Search, MapPin, Star, Crown, ChevronDown, ImageIcon } from 'lucide-react';
import { htmlToPlainText } from '@/lib/sanitize';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';

interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  /** ZERO JANK POLICY: Use this for caught errors to ensure no raw technical details are exposed */
  safeError?: (error: unknown, fallbackMessage?: string) => void;
}

interface DestinationFormProps {
  destination?: Destination;
  onSave: (data: Partial<Destination>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: Toast;
}

type TabId = 'details' | 'media' | 'content';

const CATEGORIES = [
  'Restaurant',
  'Hotel',
  'Bar',
  'Cafe',
  'Shopping',
  'Museum',
  'Gallery',
  'Architecture',
  'Park',
  'Others',
];

export function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast,
}: DestinationFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [formData, setFormData] = useState({
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    category: destination?.category || '',
    description: htmlToPlainText(destination?.description || ''),
    content: htmlToPlainText(destination?.content || ''),
    image: destination?.image || '',
    michelin_stars: destination?.michelin_stars || null,
    crown: destination?.crown || false,
    parent_destination_id: destination?.parent_destination_id || null,
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

  // Update form when destination changes
  useEffect(() => {
    if (destination) {
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        description: htmlToPlainText(destination.description || ''),
        content: htmlToPlainText(destination.content || ''),
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
            const supabase = createClient({ skipValidation: true });
            const { data, error } = await supabase
              .from('destinations')
              .select('id, slug, name, city, category')
              .eq('id', destination.parent_destination_id)
              .single();
            if (!error && data) {
              // Map the database result to match Destination type for parent selection
              setSelectedParent({
                id: data.id,
                slug: data.slug,
                name: data.name,
                city: data.city,
                category: data.category,
              } as Destination);
            }
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
        } catch {
          const text = await res.text();
          throw new Error(`Upload failed: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (error: unknown) {
      console.error('Upload error:', error);
      // ZERO JANK POLICY: Never expose raw error messages to users
      if (toast.safeError) {
        toast.safeError(error, 'Image upload failed. Please try again.');
      } else {
        toast.error('Image upload failed. Please try again.');
      }
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
        } catch {
          const text = await res.text();
          throw new Error(`Failed to fetch from Google: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Failed to fetch from Google');
      }

      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: htmlToPlainText(data.description || prev.description),
        content: htmlToPlainText(data.content || prev.content),
        image: data.image || prev.image,
      }));

      if (data.image) {
        setImagePreview(data.image);
      }

      toast.success(`Fetched data from Google Places! Name: ${data.name}, City: ${data.city}`);
    } catch (error: unknown) {
      console.error('Fetch Google error:', error);
      // ZERO JANK POLICY: Never expose raw error messages to users
      if (toast.safeError) {
        toast.safeError(error, 'Unable to fetch place details. Please try again.');
      } else {
        toast.error('Unable to fetch place details. Please try again.');
      }
    } finally {
      setFetchingGoogle(false);
    }
  };

  const [isEnriching, setIsEnriching] = useState(false);

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

    const data: Partial<Destination> = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : null,
      parent_destination_id: selectedParent?.id || null,
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
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: formData.slug,
          name: formData.name,
          city: formData.city,
          category: formData.category,
          content: formData.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Enrichment failed' }));
        throw new Error(error.error || 'Enrichment failed');
      }

      const result = await response.json();
      toast.success('Destination enriched with Google Places and AI data');

      // Update form with enriched data if available
      if (result.data?.category) {
        setFormData(prev => ({
          ...prev,
          category: result.data.category || prev.category,
        }));
      }
    } catch (error: unknown) {
      console.error('Enrich error:', error);
      if (toast.safeError) {
        toast.safeError(error, 'Unable to enrich destination. Please try again.');
      } else {
        toast.error('Unable to enrich destination. Please try again.');
      }
    } finally {
      setIsEnriching(false);
    }
  };

  const handlePlaceSelect = async (placeDetails: { placeId?: string }) => {
    if (placeDetails.placeId) {
      setFetchingGoogle(true);
      try {
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
        } catch {
          const text = await response.text();
          console.error('Error parsing response:', text);
          toast.error('Invalid response format from Google Places API');
          return;
        }
        if (data.error) {
          console.error('Error fetching place:', data.error);
          return;
        }
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          city: data.city || prev.city,
          category: data.category || prev.category,
          description: htmlToPlainText(data.description || ''),
          content: htmlToPlainText(data.content || ''),
          image: data.image || prev.image,
        }));
        if (data.image) {
          setImagePreview(data.image);
        }
        toast.success('Auto-filled from Google Places');
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setFetchingGoogle(false);
      }
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'media', label: 'Media' },
    { id: 'content', label: 'Content' },
  ];

  const inputClasses = "w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow";
  const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-1 px-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors relative",
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
              <label className={labelClasses}>Name</label>
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
                  className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Fetch details from Google"
                >
                  {fetchingGoogle ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Type to search Google Places or click the search icon to auto-fill
              </p>
            </div>

            {/* Slug and City Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="url-friendly-name"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={cn(inputClasses, "pl-9")}
                    placeholder="e.g., Tokyo"
                  />
                </div>
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className={labelClasses}>Category</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={cn(inputClasses, "text-left flex items-center justify-between")}
                >
                  <span className={formData.category ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                    {formData.category || "Select a category..."}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showCategoryDropdown && "rotate-180")} />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, category: cat });
                          setShowCategoryDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                          formData.category === cat && "bg-gray-50 dark:bg-gray-800 font-medium"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <input
                        type="text"
                        placeholder="Or type custom..."
                        value={formData.category && !CATEGORIES.includes(formData.category) ? formData.category : ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        onFocus={() => setShowCategoryDropdown(true)}
                        className="w-full px-3 py-2 text-sm bg-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Destination */}
            <div>
              <label className={labelClasses}>Parent Destination</label>
              <div className="relative">
                {selectedParent ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-md flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{selectedParent.name}</div>
                        <div className="text-xs text-gray-500">{selectedParent.city}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParent(null);
                        setFormData({ ...formData, parent_destination_id: null });
                      }}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={parentSearchQuery}
                      onChange={(e) => setParentSearchQuery(e.target.value)}
                      placeholder="Search for parent venue..."
                      className={cn(inputClasses, "pl-9")}
                    />
                    {isSearchingParent && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {parentSearchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                          >
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-4 w-4 text-gray-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{parent.name}</div>
                              <div className="text-xs text-gray-500">{parent.city} · {parent.category}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Link this venue to a parent location (e.g., bar within a hotel)
              </p>
            </div>

            {/* Badges Section */}
            <div className="pt-2">
              <label className={labelClasses}>Badges & Features</label>
              <div className="space-y-3">
                {/* Michelin Stars */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Michelin Stars</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => {
                          const michelinStars = stars || null;
                          const updatedFormData = { ...formData, michelin_stars: michelinStars };
                          if (michelinStars && michelinStars > 0) {
                            updatedFormData.category = 'Restaurant';
                          }
                          setFormData(updatedFormData);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-md text-sm font-medium transition-colors",
                          (formData.michelin_stars || 0) === stars
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        {stars}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crown Toggle */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, crown: !formData.crown })}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                    formData.crown
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Crown className={cn("h-4 w-4", formData.crown ? "text-amber-500" : "text-gray-500")} />
                    <span className="text-sm">Featured (Crown)</span>
                  </div>
                  <div className={cn(
                    "w-10 h-6 rounded-full relative transition-colors",
                    formData.crown ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                      formData.crown ? "translate-x-5" : "translate-x-1"
                    )} />
                  </div>
                </button>
              </div>
            </div>

            {/* Enrichment Section (only for existing destinations) */}
            {destination && (
              <div className="pt-2">
                <label className={labelClasses}>AI Enrichment</label>
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={isEnriching || !formData.slug || !formData.name || !formData.city}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-md flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Enrich with AI</div>
                      <div className="text-xs text-gray-500">Fetch Google Places data & generate tags</div>
                    </div>
                  </div>
                  {isEnriching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="p-5 space-y-5">
            {/* Image Upload Area */}
            <div>
              <label className={labelClasses}>Image</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden",
                  isDragging
                    ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
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
                  className="block cursor-pointer"
                >
                  {imagePreview ? (
                    <div className="relative aspect-video">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-sm font-medium">Click to change</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview(null);
                          setFormData({ ...formData, image: '' });
                          const input = document.getElementById('image-upload-input') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Drop an image here
                      </p>
                      <p className="text-xs text-gray-500">
                        or click to browse
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {uploadingImage && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}
            </div>

            {/* Image URL Input */}
            <div>
              <label className={labelClasses}>Or paste image URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    if (!imageFile) {
                      setImagePreview(e.target.value || null);
                    }
                  }}
                  placeholder="https://..."
                  className={cn(inputClasses, "pl-9")}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  setFormData({ ...formData, image: '' });
                }}
                disabled={!imagePreview && !formData.image}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Image
              </button>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <span className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Upload New
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
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={cn(inputClasses, "resize-none")}
                placeholder="A brief, punchy description (1-2 sentences)"
              />
              <div className="mt-1.5 flex justify-end">
                <span className="text-xs text-gray-400">{formData.description.length} chars</span>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Full Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className={cn(inputClasses, "resize-y min-h-[200px]")}
                placeholder="A detailed description of the destination, what makes it special, atmosphere, best time to visit, etc."
              />
              <div className="mt-1.5 flex justify-end">
                <span className="text-xs text-gray-400">{formData.content.length} chars</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : destination ? (
              'Save Changes'
            ) : (
              'Create Destination'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

