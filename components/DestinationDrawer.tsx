'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, MapPin, Tag, Heart, Check, Share2, Navigation, Sparkles, ChevronDown, Plus, Loader2, Clock, ExternalLink, Edit, Instagram, Globe2, Bookmark } from 'lucide-react';
import { Drawer } from "@/components/ui/Drawer";

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    // Remove protocol if present
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path and query params
    if (!cleanUrl) return '';
    const parts = cleanUrl.split('/');
    if (parts && parts[0]) {
      return parts[0].split('?')[0];
    }
    return cleanUrl;
  } catch {
    // If parsing fails, return original or a cleaned version
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || url;
  }
}
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import VisitModal from './VisitModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import { POIDrawer } from './POIDrawer';
import { ArchitectDesignInfo } from './ArchitectDesignInfo';
import { getDestinationImageUrl } from '@/lib/destination-images';

// Dynamically import GoogleMap to avoid SSR issues
const GoogleMap = dynamic(() => import('@/components/GoogleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  )
});

interface List {
  id: string;
  name: string;
  is_public: boolean;
}

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
}

function capitalizeCity(city: string | null | undefined): string {
  if (!city) return '';
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// City timezone mapping (fallback if timezone_id not available)
const CITY_TIMEZONES: Record<string, string> = {
  'tokyo': 'Asia/Tokyo',
  'new-york': 'America/New_York',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'bangkok': 'Asia/Bangkok',
  // Add more as needed
};

function getOpenStatus(openingHours: any, city: string, timezoneId?: string | null, utcOffset?: number | null): { isOpen: boolean; currentDay?: string; todayHours?: string } {
  if (!openingHours || !openingHours.weekday_text) {
    return { isOpen: false };
  }

  try {
    // Use timezone_id from Google Places API if available (handles DST automatically)
    // Otherwise fallback to city mapping, then UTC offset calculation, then UTC
    let now: Date;

    if (timezoneId) {
      // Best: Use timezone_id - automatically handles DST
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      // Good: Use city timezone mapping
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      // Okay: Use UTC offset (static, doesn't handle DST)
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
    } else {
      // Fallback: UTC
      now = new Date();
    }

    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Google Places API weekday_text starts with Monday (index 0)
    // We need to convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) {
      return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    }

    // Check if closed
    if (hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    // Check if 24 hours
    if (hoursText.toLowerCase().includes('24 hours') || hoursText.toLowerCase().includes('open 24 hours')) {
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    }

    if (!hoursText) return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    // Parse time ranges (e.g., "10:00 AM – 9:00 PM" or "10:00 AM – 2:00 PM, 5:00 PM – 9:00 PM")
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
  } catch (error) {
    console.error('Error parsing opening hours:', error);
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

export function DestinationDrawer({
  destination,
  isOpen,
  onClose,
  onSaveToggle,
  onVisitToggle,
}: DestinationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [showListsModal, setShowListsModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [listsWithDestination, setListsWithDestination] = useState<Set<string>>(new Set());
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListPublic, setNewListPublic] = useState(true);
  const [creatingList, setCreatingList] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'map'>('overview');

  // Reset state when destination changes
  useEffect(() => {
    if (destination && user) {
      checkInteractionStatus();
    } else {
      setIsSaved(false);
      setIsVisited(false);
    }
  }, [destination, user]);

  const checkInteractionStatus = async () => {
    if (!user || !destination) return;

    const supabase = createClient();

    // Check saved status
    const { data: savedData } = await supabase
      .from('saved_places')
      .select('id')
      .eq('user_id', user.id)
      .eq('destination_id', destination.id)
      .maybeSingle();

    setIsSaved(!!savedData);

    // Check visited status
    const { data: visitedData } = await supabase
      .from('visited_places')
      .select('id')
      .eq('user_id', user.id)
      .eq('destination_id', destination.id)
      .maybeSingle();

    setIsVisited(!!visitedData);
  };

  const handleSaveToggle = async () => {
    if (!user) {
      // TODO: Show login modal
      return;
    }

    if (!destination) return;

    // Optimistic update
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    onSaveToggle?.(destination.slug, newSavedState);

    const supabase = createClient();

    if (newSavedState) {
      await supabase
        .from('saved_places')
        .insert({
          user_id: user.id,
          destination_id: destination.id
        });
    } else {
      await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_id', destination.id);
    }
  };

  const handleVisit = async (rating?: number, notes?: string) => {
    if (!user || !destination) return;

    const supabase = createClient();

    // Optimistic update
    setIsVisited(true);
    onVisitToggle?.(destination.slug, true);
    setShowVisitModal(false);

    await supabase
      .from('visited_places')
      .insert({
        user_id: user.id,
        destination_id: destination.id,
        rating,
        notes,
        visited_at: new Date().toISOString()
      });
  };

  const handleVisitToggle = async () => {
    if (!user) {
      // TODO: Show login modal
      return;
    }

    if (!destination) return;

    if (isVisited) {
      // If already visited, just remove it
      const supabase = createClient();
      setIsVisited(false);
      onVisitToggle?.(destination.slug, false);

      await supabase
        .from('visited_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_id', destination.id);
    } else {
      // If not visited, show modal to add details
      setShowVisitModal(true);
    }
  };

  const fetchUserLists = async () => {
    if (!user || !destination) return;

    const supabase = createClient();

    // Fetch all lists for user
    const { data: lists } = await supabase
      .from('lists')
      .select('id, name, is_public')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (lists) {
      setUserLists(lists);
    }

    // Fetch lists containing this destination
    const { data: listItems } = await supabase
      .from('list_items')
      .select('list_id')
      .eq('destination_id', destination.id);

    if (listItems) {
      setListsWithDestination(new Set(listItems.map(item => item.list_id)));
    }
  };

  const toggleDestinationInList = async (listId: string) => {
    if (!user || !destination) return;

    const supabase = createClient();
    const isPresent = listsWithDestination.has(listId);

    // Optimistic update
    const newSet = new Set(listsWithDestination);
    if (isPresent) {
      newSet.delete(listId);
    } else {
      newSet.add(listId);
    }
    setListsWithDestination(newSet);

    if (isPresent) {
      await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('destination_id', destination.id);
    } else {
      await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          destination_id: destination.id
        });
    }
  };

  const createNewList = async () => {
    if (!user || !newListName.trim()) return;

    setCreatingList(true);
    const supabase = createClient();

    const { data: newList, error } = await supabase
      .from('lists')
      .insert({
        owner_id: user.id,
        name: newListName.trim(),
        description: newListDescription.trim() || null,
        is_public: newListPublic
      })
      .select()
      .single();

    if (newList && !error) {
      // Add destination to the new list
      if (destination) {
        await supabase
          .from('list_items')
          .insert({
            list_id: newList.id,
            destination_id: destination.id
          });
        
        setListsWithDestination(prev => new Set(prev).add(newList.id));
      }

      setUserLists(prev => [newList, ...prev]);
      setShowCreateListModal(false);
      setNewListName('');
      setNewListDescription('');
      setNewListPublic(true);
    }

    setCreatingList(false);
  };

  if (!destination) return null;

  // Header content for the drawer
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={onClose}
        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleSaveToggle}
          className={`p-2 rounded-full transition-colors ${
                  isSaved
                    ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
        >
                <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => {
                  fetchUserLists();
                  setShowListsModal(true);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: destination.name,
                      text: `Check out ${destination.name} on Urban Manual`,
                      url: window.location.href,
                    });
                  }
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
    </div>
        );

        return (
        <>
          <Drawer
            isOpen={isOpen}
            onClose={onClose}
            headerContent={headerContent}
            desktopWidth="600px"
            mobileHeight="92vh"
            style="glassy"
          >
            <div className="pb-20">
              {/* Hero Image */}
              <div className="relative h-64 md:h-80 w-full -mt-4 mb-6">
                <Image
                  src={getDestinationImageUrl(destination)}
                  alt={destination.name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-white/90">
                    <span>{destination.category}</span>
                    <span>•</span>
                    <span>{capitalizeCity(destination.city)}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{destination.name}</h1>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={handleVisitToggle}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${isVisited
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                      {isVisited ? (
                        <>
                          <Check className="h-4 w-4" />
                          Visited
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Mark Visited
                        </>
                      )}
                    </button>

                    {destination.website && (
                      <a
                        href={destination.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Tabs */}
              <div className="px-6">
                <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'overview'
                      ? 'text-black dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    Overview
                    {activeTab === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'details'
                      ? 'text-black dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    Details
                    {activeTab === 'details' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'map'
                      ? 'text-black dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    Map
                    {activeTab === 'map' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-8">
                  {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Description */}
                      <div>
                        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                          {stripHtmlTags(destination.description || destination.micro_description || '')}
                        </p>
                      </div>

                      {/* Architect Info */}
                      <ArchitectDesignInfo destination={destination} />

                      {/* Tags */}
                      {destination.tags && destination.tags.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {destination.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Address */}
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Address</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {destination.address || `${destination.city}, ${destination.country}`}
                          </p>
                        </div>
                      </div>

                      {/* Website */}
                      {destination.website && (
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Globe2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium mb-1">Website</h3>
                            <a
                              href={destination.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                            >
                              {extractDomain(destination.website)}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Price Level */}
                      {destination.price_level && (
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <span className="font-serif italic font-bold text-sm">$</span>
                          </div>
                          <div>
                            <h3 className="font-medium mb-1">Price Level</h3>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((level) => (
                                <span
                                  key={level}
                                  className={`text-sm ${level <= destination.price_level!
                                    ? 'text-black dark:text-white font-medium'
                                    : 'text-gray-300 dark:text-gray-700'
                                    }`}
                                >
                                  $
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'map' && (
                    <div className="h-64 md:h-80 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <GoogleMap
                        center={{
                          lat: destination.latitude || 0,
                          lng: destination.longitude || 0
                        }}
                        zoom={15}
                        markers={[{
                          id: destination.id,
                          position: {
                            lat: destination.latitude || 0,
                            lng: destination.longitude || 0
                          },
                          title: destination.name
                        }]}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Drawer>

          {/* Modals */}
          {showListsModal && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowListsModal(false)}
            >
              <div
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Save to List</h2>
                  <button
                    onClick={() => setShowListsModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {userLists.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bookmark className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">You haven't created any lists yet.</p>
                    <button
                      onClick={() => {
                        setShowListsModal(false);
                        setShowCreateListModal(true);
                      }}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium"
                    >
                      Create Your First List
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                      {userLists.map((list) => (
                        <button
                          key={list.id}
                          onClick={() => toggleDestinationInList(list.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="font-medium">{list.name}</span>
                          {listsWithDestination.has(list.id) && (
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setShowListsModal(false);
                        setShowCreateListModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Create New List</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {showCreateListModal && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowCreateListModal(false)}
            >
              <div
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Create New List</h2>
                  <button
                    onClick={() => setShowCreateListModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">List Name *</label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g., Tokyo Favorites"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="new-list-public"
                      checked={newListPublic}
                      onChange={(e) => setNewListPublic(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="new-list-public" className="text-sm">
                      Make this list public
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateListModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      disabled={creatingList}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createNewList}
                      disabled={!newListName.trim() || creatingList}
                      className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {creatingList ? 'Creating...' : 'Create List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <POIDrawer
            isOpen={isEditDrawerOpen}
            onClose={() => setIsEditDrawerOpen(false)}
            destination={destination}
            onSave={() => {
              setIsEditDrawerOpen(false);
              if (destination) {
                window.location.reload();
              }
            }}
          />

          <VisitModal
            isOpen={showVisitModal}
            onClose={() => setShowVisitModal(false)}
            onConfirm={(rating, notes) => handleVisit(rating, notes)}
            destinationName={destination?.name || ''}
          />
        </>
        );
}
