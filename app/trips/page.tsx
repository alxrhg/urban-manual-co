'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, MapPin, Trash2, X } from 'lucide-react';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';

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
      const { data, error } = await (supabase
        .from('trips')
        .insert as any)([
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-500';
      case 'upcoming':
        return 'bg-green-500';
      case 'ongoing':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const introDescription = trips.length
    ? `${trips.length} planned trip${trips.length === 1 ? '' : 's'}`
    : 'Plan and organize your adventures.';

  return (
    <div className="pb-16">
      <PageIntro
        eyebrow="Itinerary Studio"
        title="My Trips"
        description={introDescription}
        actions={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white dark:bg-white dark:text-black rounded-full transition-opacity hover:opacity-80"
          >
            <Plus className="h-4 w-4" />
            <span>New Trip</span>
          </button>
        }
      />

      <PageContainer className="space-y-10">
        {trips.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-950/60 px-10 py-16 text-center space-y-5">
            <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700" />
            <h3 className="text-xl font-medium">No trips yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start by outlining a destination, and we will help you craft the rest.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded-full transition-opacity hover:opacity-80"
            >
              <Plus className="h-4 w-4" />
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <article
                key={trip.id}
                className="flex flex-col overflow-hidden rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 shadow-sm transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                  {trip.cover_image && (
                    <img src={trip.cover_image} alt={trip.title} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`${getStatusColor(trip.status)} text-white text-xs px-3 py-1 rounded-full capitalize`}>
                      {trip.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-6 py-6">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white">{trip.title}</h3>

                  {trip.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{trip.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {trip.destination && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{trip.destination}</span>
                      </div>
                    )}

                    {(trip.start_date || trip.end_date) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/trips/${trip.id}`);
                      }}
                      className="flex-1 text-sm font-medium py-2 px-3 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      View details
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteTrip(trip.id, trip.title);
                      }}
                      className="p-2 rounded-full text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label={`Delete ${trip.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageContainer>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create new trip</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Trip title *</label>
                <input
                  type="text"
                  value={newTrip.title}
                  onChange={e => setNewTrip({ ...newTrip, title: e.target.value })}
                  placeholder="e.g., Summer in Paris"
                  className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newTrip.description}
                  onChange={e => setNewTrip({ ...newTrip, description: e.target.value })}
                  placeholder="What's this trip about?"
                  rows={3}
                  className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Destination</label>
                <input
                  type="text"
                  value={newTrip.destination}
                  onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                  className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start date</label>
                  <input
                    type="date"
                    value={newTrip.start_date}
                    onChange={e => setNewTrip({ ...newTrip, start_date: e.target.value })}
                    className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End date</label>
                  <input
                    type="date"
                    value={newTrip.end_date}
                    onChange={e => setNewTrip({ ...newTrip, end_date: e.target.value })}
                    className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createTrip}
                  className="flex-1 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                >
                  Create trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
