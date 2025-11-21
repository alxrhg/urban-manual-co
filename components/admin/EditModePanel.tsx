'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { createClient } from '@/lib/supabase/client';
import {
  Edit,
  Settings,
  ExternalLink,
  Clock,
  Users,
  Save,
  AlertTriangle,
  Globe,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface EditModeConfig {
  autoSaveInterval: number; // seconds
  conflictResolution: 'last-write-wins' | 'manual-review' | 'merge';
  editPermissions: 'admin-only' | 'all-authenticated';
  lastEditTimestamp?: string;
  activeUsersCount?: number;
}

export function EditModePanel() {
  const { isEditMode, enableEditMode, disableEditMode, canUseEditMode } = useAdminEditMode();
  const [config, setConfig] = useState<EditModeConfig>({
    autoSaveInterval: 5,
    conflictResolution: 'last-write-wins',
    editPermissions: 'admin-only',
  });
  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [destinations, setDestinations] = useState<Array<{ slug: string; name: string; city: string }>>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('um-edit-mode-config');
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load edit mode config:', e);
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = useCallback((newConfig: EditModeConfig) => {
    setConfig(newConfig);
    localStorage.setItem('um-edit-mode-config', JSON.stringify(newConfig));
  }, []);

  // Load cities for quick links
  const loadCities = useCallback(async () => {
    setIsLoadingCities(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data, error } = await supabase
        .from('destinations')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (error) throw error;

      // Get unique cities
      const uniqueCities = Array.from(
        new Map(
          (data || [])
            .map(d => ({ slug: d.city?.toLowerCase().replace(/\s+/g, '-') || '', name: d.city || '' }))
            .filter(c => c.name)
            .map(c => [c.slug, c])
        ).values()
      ).slice(0, 20); // Top 20 cities

      setCities(uniqueCities);
    } catch (e) {
      console.error('Failed to load cities:', e);
    } finally {
      setIsLoadingCities(false);
    }
  }, []);

  // Load destinations for quick links
  const loadDestinations = useCallback(async () => {
    setIsLoadingDestinations(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city')
        .order('name')
        .limit(20);

      if (error) throw error;

      setDestinations((data || []).map(d => ({
        slug: d.slug,
        name: d.name,
        city: d.city || '',
      })));
    } catch (e) {
      console.error('Failed to load destinations:', e);
    } finally {
      setIsLoadingDestinations(false);
    }
  }, []);

  // Load data when panel is opened
  useEffect(() => {
    if (isEditMode) {
      loadCities();
      loadDestinations();
    }
  }, [isEditMode, loadCities, loadDestinations]);

  // Track last edit timestamp and active users
  useEffect(() => {
    if (isEditMode) {
      const handleEdit = () => {
        saveConfig({
          ...config,
          lastEditTimestamp: new Date().toISOString(),
        });
      };

      // Listen for edit events (could be enhanced with actual edit tracking)
      window.addEventListener('um-edit-event', handleEdit);
      
      // Simulate active users count (in production, this would come from a real-time service)
      const updateActiveUsers = () => {
        // For now, we'll use a simple heuristic: if edit mode is active, assume 1 active user
        // In production, this would query a real-time service or database
        saveConfig({
          ...config,
          activeUsersCount: 1,
        });
      };
      
      updateActiveUsers();
      const interval = setInterval(updateActiveUsers, 30000); // Update every 30 seconds
      
      return () => {
        window.removeEventListener('um-edit-event', handleEdit);
        clearInterval(interval);
      };
    } else {
      // Reset active users count when edit mode is disabled
      saveConfig({
        ...config,
        activeUsersCount: 0,
      });
    }
  }, [isEditMode, config, saveConfig]);

  const openInEditMode = (path: string) => {
    const url = path.startsWith('/') ? path : `/${path}`;
    const editUrl = url.includes('?') ? `${url}&edit=1` : `${url}?edit=1`;
    window.open(editUrl, '_blank', 'noopener,noreferrer');
  };

  if (!canUseEditMode) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Mode</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Toggle edit affordances on the live site. Changes sync straight to Supabase.
          </p>
        </div>
        <Edit className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>

      <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 space-y-4">
        {/* Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Status</span>
            <Badge
              variant={isEditMode ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                isEditMode && 'bg-green-500 text-white',
                !isEditMode && 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              {isEditMode ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {isEditMode && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              {config.lastEditTimestamp && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Last Edit
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(config.lastEditTimestamp).toLocaleString()}
                  </span>
                </div>
              )}
              {config.activeUsersCount !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Active Users
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {config.activeUsersCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Settings</span>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>

          <div className="space-y-3">
            {/* Auto-save Interval */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                Auto-save Interval (seconds)
              </label>
              <Input
                type="number"
                value={config.autoSaveInterval}
                onChange={(e) => {
                  saveConfig({
                    ...config,
                    autoSaveInterval: parseInt(e.target.value, 10) || 5,
                  });
                }}
                min={1}
                max={60}
                className="h-8 text-xs"
              />
            </div>

            {/* Conflict Resolution */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                Conflict Resolution
              </label>
              <Select
                value={config.conflictResolution}
                onValueChange={(value: EditModeConfig['conflictResolution']) => {
                  saveConfig({ ...config, conflictResolution: value });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-write-wins">Last Write Wins</SelectItem>
                  <SelectItem value="manual-review">Manual Review</SelectItem>
                  <SelectItem value="merge">Merge Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Edit Permissions */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                Edit Permissions
              </label>
              <Select
                value={config.editPermissions}
                onValueChange={(value: EditModeConfig['editPermissions']) => {
                  saveConfig({ ...config, editPermissions: value });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin-only">Admin Only</SelectItem>
                  <SelectItem value="all-authenticated">All Authenticated Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Quick Links</span>
            <ExternalLink className="h-3 w-3 text-gray-400" />
          </div>

          <div className="space-y-2">
            {/* Homepage */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInEditMode('/')}
              className="w-full justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span>Open Homepage</span>
              </div>
              <ChevronRight className="h-3 w-3" />
            </Button>

            {/* Cities */}
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                City Pages
              </div>
              {isLoadingCities ? (
                <div className="text-xs text-gray-400">Loading cities...</div>
              ) : cities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {cities.slice(0, 8).map((city) => (
                    <Button
                      key={city.slug}
                      variant="outline"
                      size="sm"
                      onClick={() => openInEditMode(`/city/${city.slug}`)}
                      className="text-xs h-7"
                    >
                      {city.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">No cities available</div>
              )}
            </div>

            {/* Destinations */}
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Destination Pages
              </div>
              {isLoadingDestinations ? (
                <div className="text-xs text-gray-400">Loading destinations...</div>
              ) : destinations.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {destinations.slice(0, 5).map((dest) => (
                    <Button
                      key={dest.slug}
                      variant="ghost"
                      size="sm"
                      onClick={() => openInEditMode(`/destination/${dest.slug}`)}
                      className="w-full justify-between text-xs h-7"
                    >
                      <span className="truncate">{dest.name}</span>
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">No destinations available</div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={isEditMode ? disableEditMode : enableEditMode}
            variant={isEditMode ? 'default' : 'outline'}
            className="w-full"
            size="sm"
          >
            {isEditMode ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Disable Edit Mode
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Enable Edit Mode
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

