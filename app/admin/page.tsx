'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { DataTable } from "@/app/admin/data-table";
import { createColumns } from "@/app/admin/columns";
import type { Destination } from '@/types/destination';
import { AdminStats } from '@/components/admin/AdminStats';
import { SanitySyncSection } from '@/components/admin/SanitySyncSection';
import { InlineEditControls } from '@/components/admin/InlineEditControls';
import { DestinationForm } from '@/components/admin/DestinationForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const toast = useToast();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load destination list once on mount (client-side filtering/sorting handled by TanStack Table)
  const loadDestinationList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient({ skipValidation: true });
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('destinations')
        .select('count', { count: 'exact', head: true });
      
      if (testError) {
        console.error('[Admin] Connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      let query = supabase
        .from('destinations')
        .select('id, slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown, parent_destination_id')
        .order('slug', { ascending: true });

      // Apply search filter if present
      if (listSearchQuery.trim()) {
        query = query.or(`name.ilike.%${listSearchQuery}%,city.ilike.%${listSearchQuery}%,slug.ilike.%${listSearchQuery}%,category.ilike.%${listSearchQuery}%`);
      }

      const { data, error } = await query.limit(200);

      if (error) {
        console.error('[Admin] Supabase error loading destinations:', error);
        // Safely stringify error to avoid JSON parse issues
        try {
          console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        } catch (stringifyError) {
          console.error('[Admin] Error details (raw):', error);
        }
        toast.error(`Failed to load destinations: ${error.message || 'Unknown error'}`);
        setDestinationList([]);
        return;
      }
       
      // Sanitize data to prevent JSON parse errors from malformed content
      const sanitizedData = (data || []).map((item: any) => {
        try {
          // Ensure description and content are strings and handle any encoding issues
          const sanitized = { ...item };
          if (sanitized.description && typeof sanitized.description === 'string') {
            // Remove any problematic characters that might break JSON
            sanitized.description = sanitized.description.replace(/\u0000/g, ''); // Remove null bytes
          }
          if (sanitized.content && typeof sanitized.content === 'string') {
            sanitized.content = sanitized.content.replace(/\u0000/g, ''); // Remove null bytes
          }
          return sanitized;
        } catch (sanitizeError) {
          console.warn('[Admin] Error sanitizing destination item:', item?.slug, sanitizeError);
          // Return item as-is if sanitization fails
          return item;
        }
      });
      
      setDestinationList(sanitizedData);
      
      if (sanitizedData.length === 0 && !listSearchQuery.trim()) {
        toast.warning('No destinations found in database. Add some destinations to get started.');
      }
    } catch (e: any) {
      console.error('[Admin] Error loading destinations:', e);
      // Check if it's a JSON parse error
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

  // Load destinations when admin/auth is ready, or when search/offset changes
  useEffect(() => {
    loadDestinationList();
  }, [loadDestinationList]);

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
            // We might want to reload stats here, but AdminStats handles its own loading.
            // To trigger a reload, we would need to lift the state up or use a context/store.
            // For now, stats might be slightly stale until manual refresh or page reload.

            toast.success(`Successfully deleted "${name}"`);
        } catch (e: any) {
          console.error('Delete error:', e);
          toast.error(`Failed to delete: ${e.message}`);
        }
      }
    });
  };

  const inlineCitySlug = destinationList[0]?.city || 'tokyo';

  return (
    <div className="space-y-10 text-sm">
      <section className="space-y-10">
        <AdminStats />

        <SanitySyncSection />

        <InlineEditControls inlineCitySlug={inlineCitySlug} />

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Destinations</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search, edit, or delete any record in the catalog.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDestination(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-100"
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
                  setEditingDestination(dest as Destination);
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <DestinationForm
                destination={editingDestination || undefined}
                onSave={async (data) => {
                  setIsSaving(true);
                  try {
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
                    // Stats update would ideally happen here too, but skipping for now as discussed
                    toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
                  } catch (e: any) {
                    toast.error(`Error: ${e.message}`);
                  } finally {
                    setIsSaving(false);
                  }
                }}
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
