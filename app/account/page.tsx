'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  MapPin, Heart, CheckCircle2, Map, Loader2, User
} from "lucide-react";
import VisitedCountriesMap from "@/components/VisitedCountriesMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cityCountryMap } from "@/data/cityCountryMap";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [birthday, setBirthday] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Show sign in options if not authenticated
        setAuthChecked(true);
        setIsLoadingData(false);
        return;
      }

      setUser(session.user);
      const role = (session.user.app_metadata as Record<string, any> | null)?.role;
      setIsAdmin(role === 'admin');
      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // Load user data and places
  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);

        // Load user profile, saved and visited places in parallel
        const [profileResult, savedResult, visitedResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('saved_places')
            .select('destination_slug')
            .eq('user_id', user.id),
          supabase
            .from('visited_places')
            .select('destination_slug, visited_at, rating, notes')
            .eq('user_id', user.id)
            .order('visited_at', { ascending: false })
        ]);

        // Set user profile
        if (profileResult.data) {
          setUserProfile(profileResult.data);
          setBirthday(profileResult.data.birthday || "");
        }

        // Collect all unique slugs
        const allSlugs = new Set<string>();
        if (savedResult.data) {
          savedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }
        if (visitedResult.data) {
          visitedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }

        // Fetch all destinations in one query
        if (allSlugs.size > 0) {
          const { data: destData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, image')
            .in('slug', Array.from(allSlugs));

          if (destData) {
            // Map saved places
            if (savedResult.data) {
              setSavedPlaces(savedResult.data.map((item: any) => {
                const dest = destData.find((d: any) => d.slug === item.destination_slug);
                return dest ? {
                  destination_slug: dest.slug,
                  destination: {
                    name: dest.name,
                    city: dest.city,
                    category: dest.category,
                    image: dest.image
                  }
                } : null;
              }).filter((item: any) => item !== null));
            }

            // Map visited places
            if (visitedResult.data) {
              setVisitedPlaces(visitedResult.data.map((item: any) => {
                const dest = destData.find((d: any) => d.slug === item.destination_slug);
                return dest ? {
                  destination_slug: item.destination_slug,
                  visited_at: item.visited_at,
                  rating: item.rating,
                  notes: item.notes,
                  destination: {
                    name: dest.name,
                    city: dest.city,
                    category: dest.category,
                    image: dest.image
                  }
                } : null;
              }).filter((item: any) => item !== null));
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadUserData();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const profileData = {
        user_id: user.id,
        birthday,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setUserProfile(profileData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSignInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  // Memoize statistics
  const stats = useMemo(() => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter(Boolean),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    const uniqueCountries = new Set(
      Array.from(uniqueCities).map(city => cityCountryMap[city] || 'Other')
    );

    return {
      uniqueCities,
      uniqueCountries
    };
  }, [savedPlaces, visitedPlaces]);

  // Show loading state
  if (!authChecked || isLoadingData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <main className="px-6 md:px-10 py-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    );
  }

  // Show coming soon screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <main className="px-6 md:px-10 py-12 dark:text-white">
          <div className="max-w-md mx-auto">
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl text-center mb-4">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <span className="text-center text-gray-600 dark:text-gray-400 mb-6 block">
                  User accounts are coming soon. You'll be able to save your favorite places, track visits, and plan trips.
                </span>
                <Button
                  onClick={() => router.push('/')}
                  className="w-full"
                  variant="outline"
                  size="lg"
                >
                  Browse Destinations
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <main className="px-6 md:px-10 py-12 dark:text-white">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Account</h1>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {user.email}
                </span>
                {isAdmin && (
                  <>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">Admin</Badge>
                    <Button onClick={() => router.push('/admin')} variant="outline" size="sm">
                      Admin Dashboard
                    </Button>
                  </>
                )}
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="visited">Visited</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Places Visited</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{visitedPlaces.length}</div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Across {stats.uniqueCities.size} cities
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saved</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{savedPlaces.length}</div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Wishlist items
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cities</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueCities.size}</div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Explored
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Countries</CardTitle>
                    <Map className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueCountries.size}</div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Visited
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* World Map */}
              <Card>
                <CardHeader>
                  <CardTitle>Travel Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <VisitedCountriesMap 
                    visitedPlaces={visitedPlaces}
                    savedPlaces={savedPlaces}
                  />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {visitedPlaces.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Visits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {visitedPlaces.slice(0, 5).map((place) => (
                        <div
                          key={place.destination_slug}
                          className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                          onClick={() => router.push(`/destination/${place.destination_slug}`)}
                        >
                          {place.destination.image && (
                            <img
                              src={place.destination.image}
                              alt={place.destination.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{place.destination.name}</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">
                              {capitalizeCity(place.destination.city)} • {place.destination.category}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500 mt-1 block">
                              {new Date(place.visited_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
                      Manage your personal information
                    </span>
                  </div>
                  {!isEditingProfile && (
                    <Button
                      onClick={() => setIsEditingProfile(true)}
                      variant="outline"
                      size="sm"
                    >
                      Edit Profile
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                      Email cannot be changed
                    </span>
                  </div>

                  <div>
                    <label htmlFor="birthday" className="block text-sm font-medium mb-2">
                      Birthday
                    </label>
                    <input
                      id="birthday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      disabled={!isEditingProfile}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                      Your birthday helps us personalize your experience
                    </span>
                  </div>

                  {isEditingProfile && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex-1"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setBirthday(userProfile?.birthday || "");
                        }}
                        variant="outline"
                        disabled={isSavingProfile}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Saved Tab */}
            <TabsContent value="saved" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Saved Places ({savedPlaces.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedPlaces.length === 0 ? (
                    <span className="text-center py-8 text-gray-500 dark:text-gray-400 block">
                      No saved places yet. Start exploring and save your favorites!
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savedPlaces.map((place) => (
                        <div
                          key={place.destination_slug}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                          onClick={() => router.push(`/destination/${place.destination_slug}`)}
                        >
                          {place.destination.image && (
                            <img
                              src={place.destination.image}
                              alt={place.destination.name}
                              className="w-full h-40 object-cover"
                            />
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold mb-1">{place.destination.name}</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">
                              {capitalizeCity(place.destination.city)}
                            </span>
                            <Badge variant="secondary" className="mt-2">
                              {place.destination.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Visited Tab */}
            <TabsContent value="visited" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visited Places ({visitedPlaces.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {visitedPlaces.length === 0 ? (
                    <span className="text-center py-8 text-gray-500 dark:text-gray-400 block">
                      No visited places yet. Mark places you've been to!
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visitedPlaces.map((place) => (
                        <div
                          key={place.destination_slug}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                          onClick={() => router.push(`/destination/${place.destination_slug}`)}
                        >
                          {place.destination.image && (
                            <img
                              src={place.destination.image}
                              alt={place.destination.name}
                              className="w-full h-40 object-cover"
                            />
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold mb-1">{place.destination.name}</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block">
                              {capitalizeCity(place.destination.city)}
                            </span>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="secondary">
                                {place.destination.category}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {new Date(place.visited_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

    </div>
  );
}
