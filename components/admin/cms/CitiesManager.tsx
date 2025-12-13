'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  MapPin,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  X,
  Check,
  Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';

interface City {
  name: string;
  country: string | null;
  slug: string;
  destination_count: number;
  image: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CityFormData {
  name: string;
  country: string;
  slug: string;
  description: string;
  image: string;
}

const ITEMS_PER_PAGE = 20;

export function CitiesManager() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CityFormData>({
    name: '',
    country: '',
    slug: '',
    description: '',
    image: '',
  });
  const toast = useToast();

  const fetchCities = useCallback(async () => {
    setLoading(true);
    try {
      // Get cities with aggregated data from destinations
      let query = supabase
        .from('destinations')
        .select('city, country, image, latitude, longitude, description')
        .not('city', 'is', null);

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by city
      const cityMap = new Map<string, City>();

      data?.forEach((dest) => {
        const cityName = dest.city;
        if (!cityName) return;

        const existing = cityMap.get(cityName);
        if (existing) {
          existing.destination_count++;
          // Keep the first non-null image
          if (!existing.image && dest.image) {
            existing.image = dest.image;
          }
          // Keep first coordinates
          if (!existing.latitude && dest.latitude) {
            existing.latitude = dest.latitude;
            existing.longitude = dest.longitude;
          }
        } else {
          cityMap.set(cityName, {
            name: cityName,
            country: dest.country,
            slug: cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            destination_count: 1,
            image: dest.image,
            description: null,
            latitude: dest.latitude,
            longitude: dest.longitude,
          });
        }
      });

      let cityList = Array.from(cityMap.values());

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        cityList = cityList.filter(
          (city) =>
            city.name.toLowerCase().includes(query) ||
            city.country?.toLowerCase().includes(query)
        );
      }

      // Sort by destination count descending
      cityList.sort((a, b) => b.destination_count - a.destination_count);

      setTotalCount(cityList.length);

      // Paginate
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      setCities(cityList.slice(start, end));
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      toast.error('Failed to fetch cities');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, toast]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const openEditDialog = (city: City) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      country: city.country || '',
      slug: city.slug,
      description: city.description || '',
      image: city.image || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingCity) return;

    setIsSaving(true);
    try {
      // Update all destinations in this city with new country/image if changed
      const updates: Record<string, unknown> = {};

      if (formData.country && formData.country !== editingCity.country) {
        updates.country = formData.country;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('destinations')
          .update(updates)
          .eq('city', editingCity.name);

        if (error) throw error;
      }

      toast.success(`Updated ${editingCity.name}`);

      setIsDialogOpen(false);
      setEditingCity(null);
      fetchCities();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Cities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount.toLocaleString()} cities with destinations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cities..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Cities Table */}
      {loading ? (
        <LoadingState />
      ) : cities.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery} onClear={() => setSearchQuery('')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                  City
                </th>
                <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                  Country
                </th>
                <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                  Destinations
                </th>
                <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium hidden lg:table-cell">
                  Status
                </th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cities.map((city) => (
                <tr
                  key={city.name}
                  className="group hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        {city.image ? (
                          <img
                            src={city.image}
                            alt={city.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-black dark:text-white">
                          {city.name}
                        </span>
                        <span className="text-xs text-gray-400 block">{city.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {city.country || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className="font-mono">
                      {city.destination_count}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      {city.image ? (
                        <Badge variant="success" className="text-[10px]">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          Image
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          No Image
                        </Badge>
                      )}
                      {city.latitude && (
                        <Badge variant="secondary" className="text-[10px]">
                          <MapPin className="w-3 h-3 mr-1" />
                          Geo
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEditDialog(city)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`/city/${city.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`/admin/destinations?city=${encodeURIComponent(city.name)}`}
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            View Destinations
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalCount)} of{' '}
            {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
            <DialogDescription>
              Update city information. Changes will apply to all destinations in this city.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">City Name</Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500">City name cannot be changed directly</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., Japan, USA, France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of the city..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Hero Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
              {formData.image && (
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg mt-2"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/6" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasSearch, onClear }: { hasSearch: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        {hasSearch ? 'No cities found' : 'No cities yet'}
      </p>
      {hasSearch && (
        <Button variant="link" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}
