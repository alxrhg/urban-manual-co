"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Palette, Calendar, MapPin, Sparkles, Info, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  is_public: boolean;
  destination_count: number;
  created_at: string;
  user_id: string;
}

interface RecommendedPlace {
  place_id: string;
  name: string;
  city: string;
  score: number;
}

export default function DiscoverTab() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recommendedPlaces, setRecommendedPlaces] = useState<RecommendedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['theme']));
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // Load collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      // Load recommended places
      const response = await fetch("/api/discovery/recommend");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const placesData = await response.json();
      setRecommendedPlaces(placesData || []);
      
      setLoading(false);
    } catch (err: any) {
      console.error('[DiscoverTab] Error loading data:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Manifesto Banner */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-8 md:p-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
              Curation Strategy
            </h2>
          </div>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              Collections are the storytelling backbone of Urban Manual. Each curated list transforms individual destinations into cohesive narratives that guide travelers through meaningful experiences.
            </p>
            <p>
              When creating collections, think like an editor: choose destinations that share a theme, mood, or journey. Whether it's "Hidden Gems in Tokyo" or "Romantic Paris Evenings," every collection should tell a story that helps travelers discover not just places, but experiences.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Focus on quality over quantity. A well-curated collection of 5 exceptional places resonates more than a list of 50 random spots.
            </p>
          </div>
        </div>
      </div>

      {/* Collections Management */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white mb-2">
              Curated Collections
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Manage collections that showcase destinations through storytelling and visual narrative.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCollection(null);
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-16 px-6 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-medium text-black dark:text-white mb-2">No collections yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                Start curating your first collection to tell a story through destinations. Each collection helps travelers discover experiences, not just places.
              </p>
              <button
                onClick={() => {
                  setEditingCollection(null);
                  setShowCreateForm(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Collection
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={() => {
                  setEditingCollection(collection);
                  setShowCreateForm(true);
                }}
                onDelete={async () => {
                  if (confirm(`Delete "${collection.name}"? This cannot be undone.`)) {
                    const supabase = createClient();
                    await supabase.from('collections').delete().eq('id', collection.id);
                    loadData();
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommended Places */}
      {recommendedPlaces.length > 0 && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white mb-2">
              Discovery Recommendations
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Places similar to your curated destinations, ready to be added to collections.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommendedPlaces.map((p) => (
              <div 
                key={p.place_id} 
                className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
              >
                <div className="text-sm font-medium mb-1 text-black dark:text-white">{p.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.city}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Score: {p.score?.toFixed(3) || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Collection Form */}
      {showCreateForm && (
        <CollectionForm
          collection={editingCollection}
          onClose={() => {
            setShowCreateForm(false);
            setEditingCollection(null);
          }}
          onSave={async (data) => {
            const supabase = createClient();
            if (editingCollection) {
              await supabase.from('collections').update(data).eq('id', editingCollection.id);
            } else {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('collections').insert({
                  ...data,
                  user_id: user.id,
                  destination_count: 0,
                });
              }
            }
            setShowCreateForm(false);
            setEditingCollection(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-gray-200 dark:hover:border-gray-600 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Preview - Mood Board */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
        {collection.emoji ? (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            {collection.emoji}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {collection.color && (
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: collection.color }}
          />
        )}
        
        {/* Action Buttons - Visible on Hover */}
        <div
          className={`absolute top-3 right-3 flex items-center gap-2 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Edit collection"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label="Delete collection"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-base leading-tight text-black dark:text-white line-clamp-1">
            {collection.name}
          </h3>
          {collection.is_public && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              Public
            </span>
          )}
        </div>
        
        {collection.description && (
          <p className="text-sm font-normal text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {collection.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs font-normal text-gray-500 dark:text-gray-500 pt-1">
          <span>{collection.destination_count || 0} places</span>
          <span>·</span>
          <span>{new Date(collection.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function CollectionForm({
  collection,
  onClose,
  onSave,
}: {
  collection: Collection | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['theme']));
  const [formData, setFormData] = useState({
    name: collection?.name || '',
    description: collection?.description || '',
    emoji: collection?.emoji || '📍',
    color: collection?.color || '#3B82F6',
    is_public: collection?.is_public ?? false,
  });
  const [saving, setSaving] = useState(false);

  const toggleStep = (step: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const emojiOptions = ['📍', '🍽️', '🏨', '☕', '🎨', '🌃', '🌊', '🏔️', '🌸', '🎭', '🛍️', '🍷'];
  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Green', value: '#10B981' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-medium text-black dark:text-white">
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Theme & Identity */}
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleStep('theme')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-black dark:text-white">Theme & Identity</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name, description, and visual style</p>
                </div>
              </div>
              {expandedSteps.has('theme') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSteps.has('theme') && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Choose a name that tells a story. Good examples: "Hidden Gems in Tokyo", "Romantic Paris Evenings", "Artisan Coffee Trail". Avoid generic names like "My Places" or "Favorites".
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Hidden Gems in Tokyo"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell the story of this collection. What connects these places? What experience do they create together?"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Emoji
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, emoji })}
                          className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-colors ${
                            formData.emoji === emoji
                              ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-800'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color Theme
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={`w-10 h-10 rounded-lg border-2 transition-colors ${
                            formData.color === color.value
                              ? 'border-black dark:border-white ring-2 ring-offset-2 ring-black dark:ring-white'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          style={{ backgroundColor: color.value }}
                          aria-label={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Destinations */}
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleStep('destinations')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-black dark:text-white">Destinations</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Add places to your collection</p>
                </div>
              </div>
              {expandedSteps.has('destinations') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSteps.has('destinations') && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Add destinations after creating the collection. Focus on quality—5-10 well-chosen places tell a stronger story than 50 random spots.
                  </p>
                </div>
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  Destination management will be available after collection creation.
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Scheduling & Visibility */}
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleStep('scheduling')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-black dark:text-white">Visibility & Settings</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Control who can see this collection</p>
                </div>
              </div>
              {expandedSteps.has('scheduling') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSteps.has('scheduling') && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Public collections appear in discovery feeds and can inspire other travelers. Private collections remain personal and are only visible to you.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                  <label htmlFor="is_public" className="text-sm text-gray-700 dark:text-gray-300">
                    Make this collection public
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
            >
              {saving ? 'Saving...' : collection ? 'Update Collection' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
