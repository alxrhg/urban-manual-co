
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2 } from 'lucide-react';

interface TripActionsProps {
    tripId: string;
    tripTitle: string;
}

export default function TripActions({ tripId, tripTitle }: TripActionsProps) {
    const router = useRouter();

    const deleteTrip = async () => {
        if (!confirm(`Are you sure you want to delete "${tripTitle}"?`)) return;

        try {
            const supabaseClient = createClient();
            if (!supabaseClient) return;

            const { error } = await supabaseClient
                .from('trips')
                .delete()
                .eq('id', tripId);

            if (error) throw error;

            router.push('/trips');
            router.refresh();
        } catch (error) {
            console.error('Error deleting trip:', error);
            alert('Failed to delete trip');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => router.push(`/trips/${tripId}/edit`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                aria-label={`Edit ${tripTitle}`}
            >
                <Edit2 className="h-4 w-4" />
            </button>
            <button
                onClick={deleteTrip}
                className="p-2 text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity"
                aria-label={`Delete ${tripTitle}`}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
