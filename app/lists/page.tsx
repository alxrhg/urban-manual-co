'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { PageIntro } from "@/components/PageIntro";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Lock,
  Globe,
  Trash2,
  Loader2,
  Heart,
  MapPin,
  X,
  Sparkles,
} from "lucide-react";

interface List {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_public: boolean;
  is_collaborative: boolean;
  cover_image?: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  like_count?: number;
  cities?: string[];
}

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ListsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPublic, setNewListPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const supabaseClient = useMemo(() => createClient(), []);
  const totalPlaces = useMemo(
    () => lists.reduce((sum, list) => sum + (list.item_count || 0), 0),
    [lists]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchLists = useCallback(async () => {
    if (!user || !supabaseClient) {
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabaseClient
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching lists:', error);
        setLists([]);
      } else if (data) {
        // Fetch counts and cities for each list
        const listsWithCounts = await Promise.all(
          (data as any[]).map(async (list: any) => {
            const { count: itemCount } = await supabaseClient
              .from('list_items')
              .select('*', { count: 'exact', head: true })
              .eq('list_id', list.id);

            const { count: likeCount } = await supabaseClient
              .from('list_likes')
              .select('*', { count: 'exact', head: true })
              .eq('list_id', list.id);

            // Fetch destination cities for this list
            let cities: string[] = [];
            const { data: listItems } = await supabaseClient
              .from('list_items')
              .select('destination_slug')
              .eq('list_id', list.id);

            if (listItems && listItems.length > 0) {
              const slugs = (listItems as any[]).map((item: any) => item.destination_slug);
              const { data: destinations } = await supabaseClient
                .from('destinations')
                .select('city')
                .in('slug', slugs);

              if (destinations) {
                cities = Array.from(new Set((destinations as any[]).map((d: any) => d.city)));
              }
            }

            return {
              ...list,
              item_count: itemCount || 0,
              like_count: likeCount || 0,
              cities,
            };
          })
        );

        setLists(listsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabaseClient]);

  useEffect(() => {
    if (user) {
      fetchLists();
    }
  }, [user, fetchLists]);

  const createList = async () => {
    if (!user || !newListName.trim() || !supabaseClient) return;

    setCreating(true);
    const { data, error } = await (supabaseClient
      .from('lists')
      .insert as any)([
        {
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          is_public: newListPublic,
          is_collaborative: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } else if (data) {
      setLists([{ ...data, item_count: 0, like_count: 0, cities: [] }, ...lists]);
      setShowCreateModal(false);
      setNewListName("");
      setNewListDescription("");
      setNewListPublic(true);
    }

    setCreating(false);
  };

  const deleteList = async (listId: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete "${listName}"?`)) return;

    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('lists')
      .delete()
      .eq('id', listId);

    if (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    } else {
      setLists(lists.filter(l => l.id !== listId));
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pb-20">
      <PageIntro
        eyebrow="Collections Studio"
        title="My Lists"
        description="Curate your own collections of must-visit destinations and share them with your travel circle."
        actions={
          <Button
            size="sm"
            className="rounded-full px-5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            New list
          </Button>
        }
      />

      <PageContainer className="space-y-12">
        <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                Snapshot
              </p>
              <h2 className="text-2xl font-semibold leading-tight text-foreground">
                Your saved collections
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Group favorite restaurants, boutique hotels, and experiences by city, travel vibe, or itinerary. Your lists sync across web and Travel Intelligence.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/90 px-5 py-4 shadow-sm">
                <Sparkles className="h-5 w-5 text-blue-500" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                    Total lists
                  </p>
                  <p className="text-lg font-semibold text-foreground">{lists.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/90 px-5 py-4 shadow-sm">
                <MapPin className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                    Places saved
                  </p>
                  <p className="text-lg font-semibold text-foreground">{totalPlaces}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className="h-48 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-background/95 px-10 py-16 text-center">
              <div className="absolute inset-x-[-30%] top-[-20%] h-64 rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-900/30" aria-hidden="true" />
              <div className="relative mx-auto max-w-md space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground">No lists yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start a collection for your next city break, group restaurants by mood, or build a capsule of places you love.
                </p>
                <Button className="rounded-full px-5" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4" />
                  Create your first list
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {lists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => router.push(`/lists/${list.id}`)}
                  className="group relative flex flex-col justify-between rounded-3xl border border-border bg-card/95 p-6 shadow-sm transition hover:-translate-y-1 hover:border-foreground/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{list.name}</h3>
                      {list.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList(list.id, list.name);
                      }}
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 transition group-hover:opacity-100"
                      aria-label={`Delete ${list.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {list.item_count} {list.item_count === 1 ? 'place' : 'places'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {list.is_public ? <Globe className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                        {list.is_public ? 'Public' : 'Private'}
                      </span>
                      {(list.like_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-600 dark:bg-rose-900/30 dark:text-rose-200">
                          <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          {(list.like_count || 0)} {list.like_count === 1 ? 'like' : 'likes'}
                        </span>
                      )}
                    </div>

                    {list.cities && list.cities.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {list.cities.slice(0, 3).map(city => capitalizeCity(city)).join(', ')}
                        {list.cities.length > 3 && ` +${list.cities.length - 3} more`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </PageContainer>

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Create new list</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep places grouped by travel plans, vibes, or friends.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <Label htmlFor="list-name" className="text-xs font-semibold uppercase tracking-[1.5px] text-muted-foreground">
                  List name <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="mt-2"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="list-description" className="text-xs font-semibold uppercase tracking-[1.5px] text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="list-description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="mt-2 resize-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                <div className="space-y-1">
                  <Label htmlFor="list-public" className="text-xs font-semibold uppercase tracking-[1.5px] text-muted-foreground">
                    Visibility
                  </Label>
                  <p className="text-xs text-muted-foreground">Public lists can be shared with friends and collaborators.</p>
                </div>
                <Switch
                  id="list-public"
                  checked={newListPublic}
                  onCheckedChange={setNewListPublic}
                  aria-label="Toggle public list"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={createList}
                  disabled={!newListName.trim() || creating}
                >
                  {creating ? 'Creating…' : 'Create list'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
