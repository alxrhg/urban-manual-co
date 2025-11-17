'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Itinerary } from '@/types/common';
import { ItineraryPlanner } from '@/components/ItineraryPlanner';
import { MapPin, Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ItinerariesTabProps {
  itineraries: Itinerary[];
}

export default function ItinerariesTab({ itineraries: initialItineraries }: ItinerariesTabProps) {
  const router = useRouter();
  const [itineraries, setItineraries] = useState(initialItineraries);
  const [showItineraryDialog, setShowItineraryDialog] = useState(false);
  const [editingItineraryId, setEditingItineraryId] = useState<string | null>(null);

  const loadItineraries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading itineraries:', error);
    } else {
      setItineraries(data as Itinerary[]);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingItineraryId(null);
            setShowItineraryDialog(true);
          }}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <Plus className="h-3 w-3" />
          New Itinerary
        </button>
      </div>

      {itineraries.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No itineraries yet</p>
          <button
            onClick={() => {
              setEditingItineraryId(null);
              setShowItineraryDialog(true);
            }}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
          >
            Create your first itinerary
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itineraries.map((itinerary) => (
            <div
              key={itinerary.id}
              className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <button
                onClick={() => router.push(`/itineraries/${itinerary.id}`)}
                className="text-left p-4 flex-1"
              >
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{itinerary.name}</h3>
                {itinerary.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{itinerary.description}</p>
                )}
                <div className="space-y-1 text-xs text-gray-400">
                  {(itinerary.start_date || itinerary.end_date) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {itinerary.start_date ? new Date(itinerary.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {itinerary.end_date && ` – ${new Date(itinerary.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 p-4 pt-0 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItineraryId(itinerary.id);
                    setShowItineraryDialog(true);
                  }}
                  className="p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={`Edit ${itinerary.name}`}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${itinerary.name}"?`)) {
                      try {
                        const { error } = await supabase
                          .from('itineraries')
                          .delete()
                          .eq('id', itinerary.id);
                        if (error) throw error;
                        loadItineraries();
                      } catch (error) {
                        console.error('Error deleting itinerary:', error);
                        alert('Failed to delete itinerary');
                      }
                    }
                  }}
                  className="p-2 rounded-xl text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label={`Delete ${itinerary.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ItineraryPlanner
        isOpen={showItineraryDialog}
        tripId={editingItineraryId || undefined}
        onClose={() => {
          setShowItineraryDialog(false);
          setEditingItineraryId(null);
          loadItineraries();
        }}
      />
    </div>
  );
}
