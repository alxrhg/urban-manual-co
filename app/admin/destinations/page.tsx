'use client';

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { ContentManager } from '@/features/admin/components/cms';
import { DestinationForm } from '@/features/admin/components/DestinationForm';
import type { Destination } from '@/types/destination';

export const dynamic = 'force-dynamic';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-open editor when slug query parameter is present
  useEffect(() => {
    const slug = searchParams?.get('slug');
    if (slug) {
      const fetchDestination = async () => {
        const supabase = createClient({ skipValidation: true });
        const { data } = await supabase
          .from('destinations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (data) {
          setEditingDestination(data);
          setShowCreateModal(true);
          // Remove slug from URL without page reload
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('slug');
            window.history.replaceState({}, '', url.toString());
          }
        }
      };
      fetchDestination();
    }
  }, [searchParams]);

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
          .insert([data] as Destination[]);
        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingDestination(null);
      setRefreshKey(prev => prev + 1);
      toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
    } catch (e: unknown) {
      // ZERO JANK POLICY: Never expose raw error messages to users
      toast.safeError(e, 'Unable to save destination');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDestination = (destination: Destination) => {
    setEditingDestination(destination);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingDestination(null);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      <ContentManager
        key={refreshKey}
        onEditDestination={handleEditDestination}
        onCreateNew={handleCreateNew}
      />

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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingDestination ? 'Edit Destination' : 'Create New Destination'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDestination(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <DestinationForm
                destination={editingDestination ?? undefined}
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
