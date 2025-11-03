'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, MapPin, Trash2, X } from 'lucide-react';
import { ProvenanceRibbon } from '@/components/ProvenanceRibbon';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_public: boolean;
  cover_image: string | null;
  created_at: string;
}

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async () => {
    if (!newTrip.title.trim()) {
      alert('Please enter a trip title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            title: newTrip.title,
            description: newTrip.description || null,
            destination: newTrip.destination || null,
            start_date: newTrip.start_date || null,
            end_date: newTrip.end_date || null,
            status: 'planning',
            user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setTrips([data, ...trips]);
      setShowCreateDialog(false);
      setNewTrip({ title: '', description: '', destination: '', start_date: '', end_date: '' });
    } catch (error: any) {
      console.error('Error creating trip:', error);

      // Show detailed error message
      let errorMessage = 'Failed to create trip';
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error?.code === '42P01') {
        errorMessage = 'Database table "trips" does not exist. Please run the migrations in Supabase. See migrations/README.md for instructions.';
      }

      alert(errorMessage);
    }
  };

  const deleteTrip = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);

      if (error) throw error;

      setTrips(trips.filter((trip) => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-700';
      case 'upcoming':
        return 'bg-emerald-100 text-emerald-700';
      case 'ongoing':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="px-6 md:px-10 py-12 dark:text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <span className="text-gray-500">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="px-6 md:px-10 py-12 dark:text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div className="space-y-4 max-w-xl">
            <ProvenanceRibbon variant="compact" />
            <div>
              <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-gray-900">Your Manual of Journeys</h1>
              <p className="mt-2 text-sm text-gray-600">
                Curate itineraries with the same considered lens—catalog cities, mark moments, and return to an evolving atlas of personal travel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2.5 text-sm tracking-[0.16em] uppercase hover:opacity-85 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Trip</span>
          </button>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-xl font-medium mb-2">No trips yet</h3>
            <span className="text-gray-500 dark:text-gray-400 mb-6">
              Start planning your next adventure
            </span>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2.5 text-sm tracking-[0.16em] uppercase hover:opacity-85 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Trip</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {trips.map((trip) => {
              const start = formatDate(trip.start_date);
              const end = formatDate(trip.end_date);
              return (
                <article
                  key={trip.id}
                  className="group flex flex-col gap-5 rounded-[28px] border border-gray-200 bg-white/75 px-5 pt-5 pb-6 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <span className="text-[0.65rem] tracking-[0.2em] uppercase text-gray-500">
                        Itinerary
                      </span>
                      <h3 className="font-serif text-xl tracking-tight text-gray-900 line-clamp-2">
                        {trip.title}
                      </h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${getStatusBadge(trip.status)}`}>
                      {trip.status}
                    </span>
                  </div>

                  {trip.description && (
                    <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">
                      {trip.description}
                    </p>
                  )}

                  <div className="space-y-3 text-sm text-gray-600">
                    {trip.destination && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{trip.destination}</span>
                      </div>
                    )}

                    {(start || end) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {start || 'Date TBD'}
                          {end && ` — ${end}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/trips/${trip.id}`);
                      }}
                      className="inline-flex items-center gap-2 text-sm font-medium tracking-[0.14em] uppercase text-gray-700 hover:text-black"
                    >
                      Open Trip
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrip(trip.id, trip.title);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Create Trip Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-[24px] max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif tracking-tight">Create New Trip</h2>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs tracking-[0.18em] uppercase text-gray-500 mb-2">
                    Trip Title *
                  </label>
                  <input
                    type="text"
                    value={newTrip.title}
                    onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                    placeholder="e.g., Summer in Paris"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-[0.18em] uppercase text-gray-500 mb-2">Description</label>
                  <textarea
                    value={newTrip.description}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, description: e.target.value })
                    }
                    placeholder="What's this trip about?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-[0.18em] uppercase text-gray-500 mb-2">Destination</label>
                  <input
                    type="text"
                    value={newTrip.destination}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, destination: e.target.value })
                    }
                    placeholder="e.g., Paris, France"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.18em] uppercase text-gray-500 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newTrip.start_date}
                      onChange={(e) =>
                        setNewTrip({ ...newTrip, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-[0.18em] uppercase text-gray-500 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newTrip.end_date}
                      onChange={(e) =>
                        setNewTrip({ ...newTrip, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTrip}
                    className="flex-1 px-4 py-2 rounded-full bg-black text-white tracking-[0.16em] uppercase text-xs hover:opacity-85 transition-opacity"
                  >
                    Create Trip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
