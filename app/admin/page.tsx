'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { DataTable } from "./data-table";
import { createColumns } from "./columns";
import type { Destination } from '@/types/destination';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { capitalizeCity } from '@/lib/utils';
import { AdminStats } from '@/components/admin/AdminStats';
import { SanitySyncSection } from '@/components/admin/SanitySyncSection';
import { DestinationForm } from '@/components/admin/DestinationForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const {
    isEditMode: inlineEditModeEnabled,
    enableEditMode: enableInlineEditMode,
    disableEditMode: disableInlineEditMode,
  } = useAdminEditMode();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const handleLaunchEditMode = useCallback((path: string) => {
    if (typeof window === 'undefined') return;
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    enableInlineEditMode();
    const url = formattedPath.includes('?') ? `${formattedPath}&edit=1` : `${formattedPath}?edit=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [enableInlineEditMode]);

  // Load destination list
  const loadDestinationList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient({ skipValidation: true });
      
      // Test connection first
      const { error: testError } = await supabase
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
        toast.error(`Failed to load destinations: ${error.message || 'Unknown error'}`);
        setDestinationList([]);
        return;
      }
       
      // Sanitize data to prevent JSON parse errors from malformed content
      const sanitizedData = (data || []).map((item: any) => {
        try {
          const sanitized = { ...item };
          if (sanitized.description && typeof sanitized.description === 'string') {
            sanitized.description = sanitized.description.replace(/\u0000/g, '');
          }
          if (sanitized.content && typeof sanitized.content === 'string') {
            sanitized.content = sanitized.content.replace(/\u0000/g, '');
          }
          return sanitized;
        } catch (sanitizeError) {
          console.warn('[Admin] Error sanitizing destination item:', item?.slug, sanitizeError);
          return item;
        }
      });
      
      setDestinationList(sanitizedData);
      
      if (sanitizedData.length === 0 && !listSearchQuery.trim()) {
        toast.warning('No destinations found in database. Add some destinations to get started.');
      }
    } catch (e: any) {
      console.error('[Admin] Error loading destinations:', e);
      if (e.message?.includes('JSON') || e.message?.includes('parse') || e instanceof SyntaxError) {
        toast.error('Failed to load destinations: Invalid data format. Some destinations may have corrupted content.');
      } else {
        toast.error(`Error loading destinations: ${e.message || 'Unknown error'}`);
      }
      setDestinationList([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [listSearchQuery, toast]);

  // Load destinations when admin/auth is ready, or when search changes
  useEffect(() => {
    loadDestinationList();
  }, [loadDestinationList]);

  // Auto-open editor when slug query parameter is present
  useEffect(() => {
    const slug = searchParams?.get('slug');
    if (slug && destinationList.length > 0 && !showCreateModal) {
      const destination = destinationList.find((d: any) => d.slug === slug);
      if (destination) {
        setEditingDestination(destination);
        setShowCreateModal(true);
        // Remove slug from URL without page reload
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('slug');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [searchParams, destinationList, showCreateModal]);

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
          setStatsRefreshKey(prev => prev + 1); // Refresh stats

          toast.success(`Successfully deleted "${name}"`);
        } catch (e: any) {
          console.error('Delete error:', e);
          toast.error(`Failed to delete: ${e.message}`);
        }
      }
    });
  };

  const handleSaveDestination = async (data: Partial<Destination>) => {
    setIsSaving(true);
    try {
      // Auto-set category for certain names
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
          .insert([data] as any);
        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingDestination(null);
      await loadDestinationList();
      setStatsRefreshKey(prev => prev + 1); // Refresh stats
      toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const inlineCitySlug = destinationList[0]?.city || 'tokyo';
  const inlineCityLabel = capitalizeCity(inlineCitySlug);

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-6">
        <AdminStats refreshKey={statsRefreshKey} />

        <SanitySyncSection />

        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Inline editing</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Toggle edit affordances on the live site. Changes sync straight to Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLaunchEditMode('/')}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Open homepage
            </button>
            <button
              onClick={() => handleLaunchEditMode(`/city/${inlineCitySlug}`)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Edit {inlineCityLabel}
            </button>
            {inlineEditModeEnabled ? (
              <button
                onClick={disableInlineEditMode}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-red-600 dark:bg-red-500 rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Turn off
              </button>
            ) : (
              <button
                onClick={enableInlineEditMode}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Enable now
              </button>
            )}
            <Link
              href="/admin/discover"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Go to Discover
            </Link>
          </div>
          {inlineEditModeEnabled && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Edit mode is active. Use the edit badge on any destination card to make changes in place.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Destinations</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Search, edit, or delete any record in the catalog.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDestination(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
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

      {/* Create/Edit Modal */}
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <DestinationForm
                destination={editingDestination}
                toast={toast}
                onSave={handleSaveDestination}
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
