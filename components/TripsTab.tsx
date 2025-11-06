'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, MapPin, Edit2, Trash2, X, ChevronDown, ChevronRight, Save } from 'lucide-react';
import Image from 'next/image';

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

interface TripsTabProps {
  onCreateTrip?: () => void;
}

export function TripsTab({ onCreateTrip }: TripsTabProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Trip>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
  });

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
        .eq('user_id', user?.id)
        .order('start_date', { ascending: true, nullsFirst: false })
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

      if (error) throw error;

      setTrips([data, ...trips]);
      setShowCreateDialog(false);
      setNewTrip({ title: '', description: '', destination: '', start_date: '', end_date: '' });

      if (onCreateTrip) onCreateTrip();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.code === '42P01'
        ? 'Database table "trips" does not exist. Please run migrations.'
        : 'Failed to create trip');
    }
  };

  const updateTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: editForm.title,
          description: editForm.description,
          destination: editForm.destination,
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          status: editForm.status,
        })
        .eq('id', tripId);

      if (error) throw error;

      setTrips(trips.map(t => t.id === tripId ? { ...t, ...editForm } : t));
      setEditingTripId(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Failed to update trip');
    }
  };

  const deleteTrip = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      setTrips(trips.filter(trip => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  const startEditing = (trip: Trip) => {
    setEditingTripId(trip.id);
    setEditForm({
      title: trip.title,
      description: trip.description,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      status: trip.status,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500';
      case 'upcoming': return 'bg-green-500';
      case 'ongoing': return 'bg-purple-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
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

  const getDaysUntilTrip = (startDate: string | null) => {
    if (!startDate) return null;
    const now = new Date();
    const start = new Date(startDate);
    const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading trips...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Your Trips
          </h2>
          <p className="text-xs text-gray-400">
            {trips.length === 0
              ? 'No trips yet. Start planning your next adventure!'
              : `${trips.length} trip${trips.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <Plus className="h-3 w-3" />
          New Trip
        </button>
      </div>

      {/* Trips List */}
      {trips.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-sm font-medium mb-2">No trips planned</h3>
          <p className="text-xs text-gray-500 mb-4">
            Create your first trip and start planning destinations
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
          >
            Create Trip
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => {
            const isExpanded = expandedTripId === trip.id;
            const isEditing = editingTripId === trip.id;
            const daysUntil = getDaysUntilTrip(trip.start_date);

            return (
              <div
                key={trip.id}
                className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Trip Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      className="flex-1 text-left flex items-start gap-3 group"
                    >
                      <div className="pt-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {trip.title}
                          </h3>
                          <span className={`${getStatusColor(trip.status)} text-white text-[10px] px-2 py-0.5 rounded-full capitalize`}>
                            {trip.status}
                          </span>
                        </div>

                        {trip.destination && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <MapPin className="h-3 w-3" />
                            <span>{trip.destination}</span>
                          </div>
                        )}

                        {(trip.start_date || trip.end_date) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(trip.start_date)}
                              {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                            </span>
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                • {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(trip)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit trip"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteTrip(trip.id, trip.title)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete trip"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {trip.description && !isEditing && (
                    <p className="text-xs text-gray-500 mt-2 ml-7 line-clamp-2">
                      {trip.description}
                    </p>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4">
                    {isEditing ? (
                      // Edit Form
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Trip Title *</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5">Description</label>
                          <textarea
                            value={editForm.description || ''}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            rows={3}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5">Destination</label>
                          <input
                            type="text"
                            value={editForm.destination || ''}
                            onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                            placeholder="e.g., Paris, France"
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Start Date</label>
                            <input
                              type="date"
                              value={editForm.start_date || ''}
                              onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">End Date</label>
                            <input
                              type="date"
                              value={editForm.end_date || ''}
                              onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5">Status</label>
                          <select
                            value={editForm.status}
                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                          >
                            <option value="planning">Planning</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              setEditingTripId(null);
                              setEditForm({});
                            }}
                            className="flex-1 px-4 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateTrip(trip.id)}
                            className="flex-1 px-4 py-2 text-xs bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                          >
                            <Save className="h-3 w-3" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Details
                      <div className="space-y-4">
                        {trip.description && (
                          <div>
                            <h4 className="text-xs font-medium mb-1.5 text-gray-500">Description</h4>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{trip.description}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-medium mb-2 text-gray-500">Trip Details</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">Status:</span>
                              <span className="capitalize">{trip.status}</span>
                            </div>
                            {trip.destination && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">Location:</span>
                                <span>{trip.destination}</span>
                              </div>
                            )}
                            {trip.start_date && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">Dates:</span>
                                <span>
                                  {formatDate(trip.start_date)}
                                  {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">Created:</span>
                              <span>{formatDate(trip.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <p className="text-xs text-gray-400 italic">
                            💡 Tip: Add destinations to your itinerary in a future update!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Trip Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Trip</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Trip Title *</label>
                <input
                  type="text"
                  value={newTrip.title}
                  onChange={e => setNewTrip({ ...newTrip, title: e.target.value })}
                  placeholder="e.g., Summer in Paris"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Description</label>
                <textarea
                  value={newTrip.description}
                  onChange={e => setNewTrip({ ...newTrip, description: e.target.value })}
                  placeholder="What's this trip about?"
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Destination</label>
                <input
                  type="text"
                  value={newTrip.destination}
                  onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })}
                  placeholder="e.g., Paris, France"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={newTrip.start_date}
                    onChange={e => setNewTrip({ ...newTrip, start_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={newTrip.end_date}
                    onChange={e => setNewTrip({ ...newTrip, end_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createTrip}
                  className="flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                >
                  Create Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
