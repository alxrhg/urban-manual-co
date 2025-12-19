'use client';

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { CMSPanelLayout } from '@/features/admin/components/cms';
import type { Destination } from '@/types/destination';

export const dynamic = 'force-dynamic';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDestination = async (data: Partial<Destination>) => {
    setIsSaving(true);
    try {
      // Auto-set category for certain names
      if (data.name) {
        const nameLower = data.name.toLowerCase();
        if (nameLower.startsWith('apple') || nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
          data.category = 'shop';
        }
      }
      if (data.michelin_stars && data.michelin_stars > 0) {
        data.category = 'restaurant';
      }

      const supabase = createClient();

      if (data.id) {
        // Update existing
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('destinations')
          .update(updateData)
          .eq('id', id);
        if (error) throw error;
        toast.success('Destination updated successfully');
      } else {
        // Create new
        if (!data.slug && data.name) {
          data.slug = data.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        const { error } = await supabase
          .from('destinations')
          .insert([data] as Destination[]);
        if (error) throw error;
        toast.success('Destination created successfully');
      }
    } catch (e: unknown) {
      toast.safeError(e, 'Unable to save destination');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CMSPanelLayout
      onSaveDestination={handleSaveDestination}
      isSaving={isSaving}
    />
  );
}
