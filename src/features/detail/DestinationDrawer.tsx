'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  X,
  MapPin,
  Bookmark,
  Share2,
  Navigation,
  ChevronDown,
  Plus,
  Loader2,
  Clock,
  ExternalLink,
  Check,
  Edit,
  Instagram,
  Phone,
  Globe,
  Building2,
  Trash2,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Drawer } from '@/components/ui/Drawer';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import { CategoryAutocompleteInput } from '@/components/CategoryAutocompleteInput';
import { ParentDestinationAutocompleteInput } from '@/components/ParentDestinationAutocompleteInput';
import GooglePlacesAutocompleteNative from '@/components/GooglePlacesAutocompleteNative';
import { DestinationCard } from '@/components/DestinationCard';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { AddToTripModal } from '@/components/AddToTripModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Dynamically import GoogleStaticMap
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
  onDestinationClick?: (slug: string) => void;
  onEdit?: (destination: Destination) => void;
  initialMode?: 'view' | 'edit';
  initialCity?: string;
}

interface FormData {
  slug: string;
  name: string;
  city: string;
  category: string;
  description: string;
  content: string;
  image: string;
  michelin_stars: number | null;
  crown: boolean;
  brand: string;
  architect: string;
  parent_destination_id: number | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractDomain(url: string): string {
  try {
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

const CITY_TIMEZONES: Record<string, string> = {
  tokyo: 'Asia/Tokyo',
  'new-york': 'America/New_York',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  singapore: 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
  bangkok: 'Asia/Bangkok',
};

function getOpenStatus(
  openingHours: any,
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): { isOpen: boolean; currentDay?: string; todayHours?: string } {
  if (!openingHours || !openingHours.weekday_text) {
    return { isOpen: false };
  }
  try {
    let now: Date;
    if (timezoneId) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + utcOffset * 60 * 1000);
    } else {
      now = new Date();
    }
    const dayOfWeek = now.getDay();
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();
    if (!hoursText) return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    if (hoursText.toLowerCase().includes('closed'))
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    if (hoursText.toLowerCase().includes('24 hours'))
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);
        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, currentDay: dayName, todayHours: hoursText };
        }
      }
    }
    return { isOpen: false, currentDay: dayName, todayHours: hoursText };
  } catch {
    return { isOpen: false };
  }
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function Section({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`py-5 ${className}`}>
      {title && (
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 dark:border-gray-800/50" />;
}

function Pill({
  children,
  onClick,
  href,
  active,
  icon,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const baseClasses = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
    active
      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
      : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {icon}
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses}>
        {icon}
        {children}
      </button>
    );
  }

  return (
    <span className={baseClasses}>
      {icon}
      {children}
    </span>
  );
}

function FormInput({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DestinationDrawer({
  destination,
  isOpen,
  onClose,
  onSaveToggle,
  onVisitToggle,
  onDestinationClick,
  onEdit,
  initialMode = 'view',
  initialCity,
}: DestinationDrawerProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  // Mode state
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

  // View mode state
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);

  // Edit mode state
  const [formData, setFormData] = useState<FormData>({
    slug: '',
    name: '',
    city: '',
    category: '',
    description: '',
    content: '',
    image: '',
    michelin_stars: null,
    crown: false,
    brand: '',
    architect: '',
    parent_destination_id: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [googlePlaceQuery, setGooglePlaceQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Reset and initialize on open
  useEffect(() => {
    if (!isOpen) {
      setMode(initialMode);
      setShowDeleteConfirm(false);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setMode(initialMode);

    if (destination) {
      // Initialize form data from destination
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        description: destination.description || '',
        content: destination.content || '',
        image: destination.image || '',
        michelin_stars: destination.michelin_stars || null,
        crown: destination.crown || false,
        brand: destination.brand || '',
        architect: destination.architect || '',
        parent_destination_id: destination.parent_destination_id || null,
      });
      if (destination.image) setImagePreview(destination.image);
    } else if (initialCity) {
      // New POI with initial city
      setFormData({
        slug: '',
        name: '',
        city: initialCity,
        category: '',
        description: '',
        content: '',
        image: '',
        michelin_stars: null,
        crown: false,
        brand: '',
        architect: '',
        parent_destination_id: null,
      });
    }
  }, [isOpen, destination, initialCity, initialMode]);

  // Auto-generate slug from name
  useEffect(() => {
    if (mode === 'edit' && formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name, mode]);

  // Load destination data
  useEffect(() => {
    async function loadData() {
      if (!destination || !isOpen) {
        setEnrichedData(null);
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      const supabase = createClient();

      // Fetch enriched data
      try {
        const { data, error } = await supabase
          .from('destinations')
          .select(
            `
            formatted_address, international_phone_number, website, rating, user_ratings_total,
            opening_hours_json, editorial_summary, timezone_id, utc_offset, vicinity, latitude, longitude,
            architect, architect_id, design_firm_id, interior_designer_id, architectural_significance, design_story,
            architect:architects!architect_id(id, name, slug, bio, nationality, image_url),
            design_firm:design_firms(id, name, slug, description, image_url),
            interior_designer:architects!interior_designer_id(id, name, slug, bio, image_url)
          `
          )
          .eq('slug', destination.slug)
          .single();

        if (!error && data) {
          const enriched: any = { ...data };
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours =
                typeof data.opening_hours_json === 'string'
                  ? JSON.parse(data.opening_hours_json)
                  : data.opening_hours_json;
            } catch {}
          }
          setEnrichedData(enriched);
        }
      } catch {}

      // Check saved/visited status
      if (user) {
        const { data: savedData } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .maybeSingle();
        setIsSaved(!!savedData);

        const { data: visitedData } = await supabase
          .from('visited_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .maybeSingle();
        setIsVisited(!!visitedData);

        // Check admin status
        const role = (user.app_metadata as any)?.role;
        setIsAdmin(role === 'admin');
      }
    }

    loadData();
  }, [destination, isOpen, user]);

  // Load nested destinations
  useEffect(() => {
    async function loadNested() {
      if (!destination || !isOpen) {
        setParentDestination(null);
        setNestedDestinations([]);
        return;
      }

      setLoadingNested(true);
      const supabase = createClient();

      try {
        if (destination.parent_destination_id) {
          const parent = await getParentDestination(supabase, destination.id!);
          setParentDestination(parent);
        }
        if (destination.id) {
          const nested = await getNestedDestinations(supabase, destination.id, false);
          setNestedDestinations(nested);
        }
      } catch {}

      setLoadingNested(false);
    }

    loadNested();
  }, [destination, isOpen]);

  // Handlers
  const handleShare = async () => {
    if (!destination) return;
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: destination.name, url });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToggle = async () => {
    if (!user || !destination) {
      if (!user) router.push('/auth/login');
      return;
    }

    const supabase = createClient();

    if (isSaved) {
      await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);
      setIsSaved(false);
      onSaveToggle?.(destination.slug, false);
    } else {
      await supabase.from('saved_places').upsert({
        user_id: user.id,
        destination_slug: destination.slug,
      });
      setIsSaved(true);
      onSaveToggle?.(destination.slug, true);
    }
  };

  const handleVisitToggle = async () => {
    if (!user || !destination) {
      if (!user) router.push('/auth/login');
      return;
    }

    const supabase = createClient();

    if (isVisited) {
      await supabase
        .from('visited_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);
      setIsVisited(false);
      onVisitToggle?.(destination.slug, false);
    } else {
      await supabase.from('visited_places').upsert({
        user_id: user.id,
        destination_slug: destination.slug,
        visited_at: new Date().toISOString(),
      });
      setIsVisited(true);
      onVisitToggle?.(destination.slug, true);
    }
  };

  // Edit mode handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);
      formDataToSend.append('slug', formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formDataToSend,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url;
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}`);
      return null;
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
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
        else {
          setIsSaving(false);
          return;
        }
      }

      const supabase = createClient();
      const destinationData = {
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: formData.name.trim(),
        city: formData.city.trim(),
        category: formData.category.trim(),
        description: formData.description?.trim() || null,
        content: formData.content?.trim() || null,
        image: imageUrl || null,
        michelin_stars: formData.michelin_stars || null,
        crown: formData.crown || false,
        brand: formData.brand?.trim() || null,
        architect: formData.architect?.trim() || null,
        parent_destination_id: formData.parent_destination_id || null,
      };

      const isEditing = !!destination;
      let error;

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('destinations')
          .update(destinationData)
          .eq('slug', destination.slug);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('destinations').insert([destinationData]);
        error = insertError;
      }

      if (error) {
        if (error.code === '23505') {
          toast.error('A destination with this slug already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success(isEditing ? 'Destination updated' : 'POI created');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!destination || !showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('destinations').delete().eq('slug', destination.slug);
      if (error) throw error;
      toast.success('Destination deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ placeId }),
      });
      if (!res.ok) throw new Error('Failed to fetch place');
      const data = await res.json();
      if (data) {
        setFormData((prev) => ({
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
    } catch {
      toast.error('Failed to load place details');
    }
  };

  // ============================================================================
  // RENDER: Header
  // ============================================================================
  const renderHeader = () => (
    <div className="flex items-center justify-between w-full px-2">
      <button
        onClick={onClose}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="flex items-center gap-2">
        {mode === 'view' && isAdmin && destination && (
          <button
            onClick={() => setMode('edit')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        {mode === 'edit' && destination && (
          <button
            onClick={() => setMode('view')}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            Cancel
          </button>
        )}
        {mode === 'edit' && (
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name || !formData.city || !formData.category}
            className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: View Mode
  // ============================================================================
  const renderViewMode = () => {
    if (!destination) return null;

    const hours = enrichedData?.opening_hours;
    const openStatus = hours ? getOpenStatus(hours, destination.city, enrichedData?.timezone_id, enrichedData?.utc_offset) : null;

    return (
      <div className="px-5 pb-8">
        {/* Hero Image */}
        {destination.image && (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-5">
            <Image
              src={destination.image}
              alt={destination.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 420px"
            />
          </div>
        )}

        {/* Identity */}
        <Section>
          {/* Location Pill */}
          <Pill href={`/city/${destination.city}`} icon={<MapPin className="h-3 w-3" />}>
            {capitalizeCity(destination.city)}
            {destination.country && `, ${destination.country}`}
          </Pill>

          {/* Name */}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-3 leading-tight">
            {destination.name}
          </h1>

          {/* Category */}
          {destination.category && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
              {destination.category}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {destination.brand && (
              <Pill icon={<Building2 className="h-3 w-3" />}>{destination.brand}</Pill>
            )}
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <Pill>
                {destination.michelin_stars} Michelin Star{destination.michelin_stars > 1 ? 's' : ''}
              </Pill>
            )}
            {destination.crown && <Pill>Crown</Pill>}
            {(enrichedData?.rating || destination.rating) && (
              <Pill>{(enrichedData?.rating || destination.rating).toFixed(1)} Rating</Pill>
            )}
          </div>

          {/* Description */}
          {destination.micro_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
              {destination.micro_description}
            </p>
          )}
        </Section>

        {/* Actions */}
        <Section>
          <div className="flex flex-wrap gap-2">
            <Pill onClick={handleSaveToggle} active={isSaved} icon={<Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />}>
              {isSaved ? 'Saved' : 'Save'}
            </Pill>
            <Pill onClick={handleShare} icon={<Share2 className="h-3 w-3" />}>
              {copied ? 'Copied!' : 'Share'}
            </Pill>
            {user && (
              <Pill onClick={handleVisitToggle} active={isVisited} icon={<Check className="h-3 w-3" />}>
                {isVisited ? 'Visited' : 'Mark Visited'}
              </Pill>
            )}
            <Pill
              href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
              icon={<Navigation className="h-3 w-3" />}
            >
              Directions
            </Pill>
          </div>
        </Section>

        <Divider />

        {/* Parent Destination */}
        {parentDestination && (
          <>
            <Section title="Located Inside">
              <DestinationCard
                destination={parentDestination}
                onClick={() => {
                  onClose();
                  router.push(`/destination/${parentDestination.slug}`);
                }}
                showBadges
              />
            </Section>
            <Divider />
          </>
        )}

        {/* Opening Hours */}
        {openStatus?.todayHours && (
          <>
            <Section title="Hours">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span
                  className={`text-sm font-medium ${
                    openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {openStatus.isOpen ? 'Open' : 'Closed'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {openStatus.todayHours}
                </span>
              </div>
            </Section>
            <Divider />
          </>
        )}

        {/* Location & Address */}
        {(enrichedData?.formatted_address || destination.neighborhood) && (
          <>
            <Section title="Location">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  {destination.neighborhood && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {destination.neighborhood}
                    </p>
                  )}
                  {enrichedData?.formatted_address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {enrichedData.formatted_address}
                    </p>
                  )}
                </div>
              </div>
            </Section>
            <Divider />
          </>
        )}

        {/* Description */}
        {destination.description && (
          <>
            <Section title="About">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {stripHtmlTags(destination.description)}
              </p>
            </Section>
            <Divider />
          </>
        )}

        {/* Architecture & Design */}
        {destination && <ArchitectDesignInfo destination={destination} />}

        {/* Nested Destinations */}
        {nestedDestinations.length > 0 && (
          <>
            <Section title={`Inside ${destination.name}`}>
              <NestedDestinations
                destinations={nestedDestinations}
                parentName={destination.name}
                onDestinationClick={(nested) => {
                  onClose();
                  router.push(`/destination/${nested.slug}`);
                }}
              />
            </Section>
            <Divider />
          </>
        )}

        {/* Contact */}
        {(enrichedData?.website || enrichedData?.international_phone_number || destination.instagram_url) && (
          <>
            <Section title="Contact">
              <div className="flex flex-wrap gap-2">
                {enrichedData?.website && (
                  <Pill
                    href={enrichedData.website.startsWith('http') ? enrichedData.website : `https://${enrichedData.website}`}
                    icon={<Globe className="h-3 w-3" />}
                  >
                    {extractDomain(enrichedData.website)}
                  </Pill>
                )}
                {enrichedData?.international_phone_number && (
                  <Pill href={`tel:${enrichedData.international_phone_number}`} icon={<Phone className="h-3 w-3" />}>
                    Call
                  </Pill>
                )}
                {destination.instagram_url && (
                  <Pill href={destination.instagram_url} icon={<Instagram className="h-3 w-3" />}>
                    Instagram
                  </Pill>
                )}
              </div>
            </Section>
            <Divider />
          </>
        )}

        {/* Map */}
        {(destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude) && (
          <Section title="Map">
            <div className="w-full h-48 rounded-xl overflow-hidden">
              <GoogleStaticMap
                center={{
                  lat: destination.latitude || enrichedData?.latitude || 0,
                  lng: destination.longitude || enrichedData?.longitude || 0,
                }}
                zoom={15}
                height="192px"
                showPin
              />
            </div>
          </Section>
        )}

        {/* Sign in prompt */}
        {!user && (
          <Section>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Sign in to save and track visits
            </button>
          </Section>
        )}

        {/* Modals */}
        {destination && (
          <>
            <SaveDestinationModal
              isOpen={showSaveModal}
              onClose={() => setShowSaveModal(false)}
              destinationSlug={destination.slug}
              destinationName={destination.name}
            />
            <VisitedModal
              isOpen={showVisitedModal}
              onClose={() => setShowVisitedModal(false)}
              destination={destination}
              onSave={() => {
                setIsVisited(true);
                setShowVisitedModal(false);
              }}
            />
            <AddToTripModal
              isOpen={showAddToTripModal}
              onClose={() => setShowAddToTripModal(false)}
              destination={destination}
              onSuccess={() => setShowAddToTripModal(false)}
            />
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: Edit Mode
  // ============================================================================
  const renderEditMode = () => {
    const inputClasses =
      'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all';

    return (
      <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-6">
        {/* Google Places Search */}
        <Section title="Import from Google">
          <GooglePlacesAutocompleteNative
            value={googlePlaceQuery}
            onChange={setGooglePlaceQuery}
            onPlaceSelect={handleGooglePlaceSelect}
            placeholder="Search Google Places..."
            className={inputClasses}
            types={['establishment']}
          />
        </Section>

        <Divider />

        {/* Basic Info */}
        <Section title="Basic Information">
          <div className="space-y-4">
            <FormInput label="Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClasses}
                placeholder="Destination name"
              />
            </FormInput>

            <FormInput label="Slug">
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className={inputClasses}
                placeholder="auto-generated-from-name"
              />
            </FormInput>

            <FormInput label="City" required>
              <CityAutocompleteInput
                value={formData.city}
                onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
                placeholder="Select city"
              />
            </FormInput>

            <FormInput label="Category" required>
              <CategoryAutocompleteInput
                value={formData.category}
                onChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                placeholder="Select category"
              />
            </FormInput>

            <FormInput label="Brand">
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                className={inputClasses}
                placeholder="Brand name"
              />
            </FormInput>

            <FormInput label="Architect">
              <input
                type="text"
                value={formData.architect}
                onChange={(e) => setFormData((prev) => ({ ...prev, architect: e.target.value }))}
                className={inputClasses}
                placeholder="Architect name"
              />
            </FormInput>

            <FormInput label="Located In (Parent)">
              <ParentDestinationAutocompleteInput
                value={formData.parent_destination_id}
                onChange={(id) => setFormData((prev) => ({ ...prev, parent_destination_id: id }))}
                currentDestinationId={destination?.id}
                placeholder="Search parent location..."
              />
            </FormInput>
          </div>
        </Section>

        <Divider />

        {/* Content */}
        <Section title="Content">
          <div className="space-y-4">
            <FormInput label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`${inputClasses} resize-none`}
                placeholder="Short description..."
              />
            </FormInput>

            <FormInput label="Content">
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                rows={5}
                className={`${inputClasses} resize-none`}
                placeholder="Full content (markdown supported)..."
              />
            </FormInput>
          </div>
        </Section>

        <Divider />

        {/* Image */}
        <Section title="Image">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
              isDragging
                ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-gray-800'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag & drop or click to upload
                </p>
              </div>
            )}
          </div>

          <div className="mt-3">
            <FormInput label="Or paste image URL">
              <input
                type="url"
                value={formData.image}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, image: e.target.value }));
                  if (!imageFile && e.target.value) setImagePreview(e.target.value);
                }}
                className={inputClasses}
                placeholder="https://..."
              />
            </FormInput>
          </div>
        </Section>

        <Divider />

        {/* Metadata */}
        <Section title="Metadata">
          <div className="space-y-4">
            <FormInput label="Michelin Stars">
              <select
                value={formData.michelin_stars || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    michelin_stars: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className={inputClasses}
              >
                <option value="">None</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
              </select>
            </FormInput>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.crown}
                onChange={(e) => setFormData((prev) => ({ ...prev, crown: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Featured (Crown)</span>
            </label>
          </div>
        </Section>

        {/* Delete Button */}
        {destination && (
          <>
            <Divider />
            <Section>
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    Delete "{destination.name}"? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Destination
                </button>
              )}
            </Section>
          </>
        )}
      </form>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      headerContent={renderHeader()}
      desktopWidth="460px"
    >
      {mode === 'view' ? renderViewMode() : renderEditMode()}
    </Drawer>
  );
}
