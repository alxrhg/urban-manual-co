'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, MapPin, Trash2, X } from 'lucide-react';

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
      <div className="px-6 md:px-10 py-12 dark:text-white">
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">My Trips</h1>
            <span className="text-gray-600 dark:text-gray-400">
              Plan and organize your adventures
            </span>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
          >
            <Plus className="h-5 w-5" />
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
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                {/* Cover Image */}
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                  {trip.cover_image && (
                    <img
                      src={trip.cover_image}
                      alt={trip.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span
                      className={`${getStatusColor(
                        trip.status
                      )} text-white text-xs px-3 py-1 rounded-full capitalize`}
                    >
                      {trip.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{trip.title}</h3>

                  {trip.description && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {trip.description}
                    </span>
                  )}

                  <div className="space-y-2 mb-4">
                    {trip.destination && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{trip.destination}</span>
                      </div>
                    )}

                    {(trip.start_date || trip.end_date) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/trips/${trip.id}`);
                      }}
                      className="flex-1 text-sm font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrip(trip.id, trip.title);
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Trip Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Create New Trip</h2>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                  <label className="block text-sm font-medium mb-1">Description</label>
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
                  <label className="block text-sm font-medium mb-1">Destination</label>
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
                    <label className="block text-sm font-medium mb-1">Start Date</label>
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
                    <label className="block text-sm font-medium mb-1">End Date</label>
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
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTrip}
                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
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
