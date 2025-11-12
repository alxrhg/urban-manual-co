'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X, Search, MapPin, Users, Eye, Heart, TrendingUp, ArrowUpRight } from 'lucide-react';
import DiscoverTab from '@/components/admin/DiscoverTab';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { DestinationsList } from './components/DestinationsList';
import { SearchLogsFeed } from './components/SearchLogsFeed';
import { type Destination } from './components/columns';
import { DestinationForm, type DestinationFormValues } from './components/DestinationForm';
import { useAdminAccess } from './hooks/useAdminAccess';
import {
  listDestinations,
  deleteDestination as deleteDestinationApi,
  createDestination,
  updateDestination,
  fetchAnalyticsSummary,
  fetchSearchLogs,
  type DestinationRecord,
  type AdminAnalyticsSummary,
  type SearchLogEntry,
  type DestinationInput,
} from './api/destinations';

const INITIAL_ANALYTICS: AdminAnalyticsSummary = {
  totalViews: 0,
  totalSearches: 0,
  totalSaves: 0,
  totalUsers: 0,
  topSearches: [],
};

type AdminTab = 'destinations' | 'analytics' | 'searches' | 'discover';

function normalizeDestinationInput(data: DestinationFormValues): DestinationInput {
  const base: DestinationInput = {
    slug: data.slug.trim(),
    name: data.name.trim(),
    city: data.city.trim(),
    category: data.category.trim(),
    description: data.description?.trim() ? data.description : null,
    content: data.content?.trim() ? data.content : null,
    image: data.image?.trim() ? data.image : null,
    michelin_stars: data.michelin_stars ?? null,
    crown: Boolean(data.crown),
    parent_destination_id: data.parent_destination_id ?? null,
  };

  const lowerName = base.name.toLowerCase();
  if (lowerName.startsWith('apple') || lowerName.startsWith('aesop') || lowerName.startsWith('aēsop')) {
    base.category = 'Shopping';
  }
  if (base.michelin_stars && base.michelin_stars > 0) {
    base.category = 'Restaurant';
  }

  if (!base.slug && base.name) {
    base.slug = base.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  if (!base.slug) {
    throw new Error('Destination slug is required. Enter a name or slug.');
  }

  return base;
}

export function AdminDashboard() {
  const toast = useToast();
  const showError = toast.error;
  const showSuccess = toast.success;
  const showWarning = toast.warning;
  const toastApi = useMemo(
    () => ({
      error: showError,
      success: showSuccess,
      warning: showWarning,
    }),
    [showError, showSuccess, showWarning]
  );
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const { user, isAdmin, authChecked } = useAdminAccess();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('destinations');
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [analyticsStats, setAnalyticsStats] = useState<AdminAnalyticsSummary>(INITIAL_ANALYTICS);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(false);

  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [hasLoadedSearches, setHasLoadedSearches] = useState(false);

  const refreshDestinations = useCallback(async () => {
    if (!isAdmin || !authChecked) return;

    setIsLoadingList(true);
    try {
      const data = await listDestinations({ search: searchQuery, limit: 50 });
      setDestinations(data);
    } catch (error) {
      console.error('[Admin] Failed to load destinations', error);
      showError(error instanceof Error ? error.message : 'Failed to load destinations');
      setDestinations([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [authChecked, isAdmin, searchQuery, showError]);

  useEffect(() => {
    if (!authChecked || !isAdmin) return;
    const timeout = window.setTimeout(() => {
      void refreshDestinations();
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [authChecked, isAdmin, searchQuery, refreshDestinations]);

  useEffect(() => {
    if (!showForm) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showForm]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const summary = await fetchAnalyticsSummary();
      setAnalyticsStats(summary);
      setHasLoadedAnalytics(true);
    } catch (error) {
      console.error('[Admin] Failed to load analytics', error);
      showError('Failed to load analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [showError]);

  const loadSearchLogs = useCallback(async () => {
    setLoadingSearches(true);
    try {
      const logs = await fetchSearchLogs();
      setSearchLogs(logs);
      setHasLoadedSearches(true);
    } catch (error) {
      console.error('[Admin] Failed to load search logs', error);
      showError('Failed to load search logs');
      setSearchLogs([]);
    } finally {
      setLoadingSearches(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!authChecked || !isAdmin) return;

    if (activeTab === 'analytics' && !hasLoadedAnalytics && !loadingAnalytics) {
      void loadAnalytics();
    } else if (activeTab === 'searches' && !hasLoadedSearches && !loadingSearches) {
      void loadSearchLogs();
    }
  }, [activeTab, authChecked, hasLoadedAnalytics, hasLoadedSearches, isAdmin, loadAnalytics, loadSearchLogs, loadingAnalytics, loadingSearches]);

  const handleDeleteDestination = useCallback(
    (slug: string, name: string) => {
      confirm({
        title: 'Delete Destination',
        message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            await deleteDestinationApi(slug);
            showSuccess(`Successfully deleted "${name}"`);
            await refreshDestinations();
          } catch (error) {
            console.error('[Admin] Delete error:', error);
            showError(error instanceof Error ? `Failed to delete: ${error.message}` : 'Failed to delete destination');
          }
        },
      });
    },
    [confirm, refreshDestinations, showError, showSuccess]
  );

  const handleSaveDestination = useCallback(
    async (data: DestinationFormValues) => {
      setIsSaving(true);
      try {
        const normalized = normalizeDestinationInput(data);

        if (editingDestination) {
          await updateDestination(editingDestination.slug, normalized);
        } else {
          await createDestination(normalized);
        }

        setShowForm(false);
        setEditingDestination(null);
        await refreshDestinations();
        showSuccess(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
      } catch (error) {
        console.error('[Admin] Save error:', error);
        showError(error instanceof Error ? error.message : 'Failed to save destination');
      } finally {
        setIsSaving(false);
      }
    },
    [editingDestination, refreshDestinations, showError, showSuccess]
  );


  if (!authChecked) {
    return (
      <main className="px-6 md:px-10 py-20">
        <div className="container mx-auto flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Calculate key health indicators
  const healthIndicators = useMemo(() => {
    const totalDestinations = destinations.length;
    const avgViews = totalDestinations > 0 ? Math.round(analyticsStats.totalViews / totalDestinations) : 0;
    const engagementRate = analyticsStats.totalSearches > 0 
      ? Math.round((analyticsStats.totalSaves / analyticsStats.totalSearches) * 100) 
      : 0;
    
    return {
      totalDestinations,
      avgViews,
      engagementRate,
      activeUsers: analyticsStats.totalUsers,
    };
  }, [destinations.length, analyticsStats]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-medium leading-tight text-black dark:text-white mb-4">
                Admin Dashboard
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                Curate destinations, monitor engagement, and shape the Urban Manual experience. Every place you add helps travelers discover the world's best spots.
              </p>
            </div>
            <button
              onClick={() => router.push('/account')}
              className="text-xs font-normal text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Back to Account
            </button>
          </div>

          {/* Key Health Indicators */}
          <div className="flex flex-wrap items-center gap-6 md:gap-8 mt-8 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">Destinations:</span>
              <span className="font-medium text-black dark:text-white">{healthIndicators.totalDestinations}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">Avg views:</span>
              <span className="font-medium text-black dark:text-white">{healthIndicators.avgViews}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">Active users:</span>
              <span className="font-medium text-black dark:text-white">{healthIndicators.activeUsers}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">Engagement:</span>
              <span className="font-medium text-black dark:text-white">{healthIndicators.engagementRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-normal">
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Pill Navigation */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-2">
              {(['destinations', 'analytics', 'searches', 'discover'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-normal transition-colors ${
                    activeTab === tab
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

        {activeTab === 'destinations' && (
          <div className="fade-in space-y-16 md:space-y-24">
            {/* Add Place Spotlight Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-8 md:p-12">
              <div className="max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white mb-4">
                  Add a new destination
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  Expand the Urban Manual collection by adding restaurants, hotels, shops, and experiences. Each destination helps travelers discover the world's best places.
                </p>
                <button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Place
                </button>
              </div>
            </div>

            {/* Section Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
              <div className="space-y-3 mb-8">
                <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                  Destination Library
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                  Manage and curate all destinations in the Urban Manual collection. Search, edit, or remove entries to keep the database accurate and up-to-date.
                </p>
              </div>
              <DestinationsList
                destinations={destinations}
                onEdit={(destination) => {
                  setEditingDestination(destination);
                  setShowForm(true);
                }}
                onDelete={handleDeleteDestination}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoading={isLoadingList}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="fade-in space-y-16 md:space-y-24">
            {loadingAnalytics ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <>
                {/* Overview Section - Large Format Cards */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                      Platform Overview
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                      Key metrics that reflect how travelers are engaging with Urban Manual's curated destinations.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Total Views Card */}
                    <div className="relative p-8 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-4xl md:text-5xl font-light mb-2 text-black dark:text-white">
                          {analyticsStats.totalViews.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Total Views</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          Cumulative destination page views across all users. This metric reflects overall content discovery and engagement.
                        </p>
                      </div>
                    </div>

                    {/* Total Searches Card */}
                    <div className="relative p-8 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 dark:bg-purple-900/20 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-4xl md:text-5xl font-light mb-2 text-black dark:text-white">
                          {analyticsStats.totalSearches.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Total Searches</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          All search queries performed by users. Higher search volume indicates active exploration and discovery intent.
                        </p>
                      </div>
                    </div>

                    {/* Total Saves Card */}
                    <div className="relative p-8 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 dark:bg-pink-900/20 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-4xl md:text-5xl font-light mb-2 text-black dark:text-white">
                          {analyticsStats.totalSaves.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Total Saves</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          Destinations saved to user collections. This represents high-value engagement and future trip planning activity.
                        </p>
                      </div>
                    </div>

                    {/* Total Users Card */}
                    <div className="relative p-8 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-4xl md:text-5xl font-light mb-2 text-black dark:text-white">
                          {analyticsStats.totalUsers.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Active Users</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          Unique users who have interacted with the platform. Growing user base indicates expanding reach and engagement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Searches Section */}
                {analyticsStats.topSearches.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-12">
                    <div className="space-y-3 mb-8">
                      <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                        Top Search Queries
                      </h2>
                      <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                        The most popular searches reveal what travelers are looking for. Use these insights to guide curation priorities.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {analyticsStats.topSearches.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className="text-sm font-normal text-black dark:text-white">{item.query}</span>
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-500">{item.count} searches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'searches' && (
          <div className="fade-in space-y-16 md:space-y-24">
            {/* Section Header */}
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                Search Activity Log
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                A narrative feed of search activity grouped by user sessions. Each session tells a story of discovery—expand to see the full journey through queries, filters, and interactions.
              </p>
            </div>

            {/* Search Logs Feed */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
              <SearchLogsFeed logs={searchLogs} isLoading={loadingSearches} />
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="fade-in space-y-16 md:space-y-24">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                Discover & Curation
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                Tools for discovering new places, managing featured content, and curating collections that help travelers explore.
              </p>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
              <DiscoverTab />
            </div>
          </div>
        )}

        {showForm && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => {
                setShowForm(false);
                setEditingDestination(null);
              }}
            />
            <div
              className={`fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${showForm ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold">{editingDestination ? 'Edit Destination' : 'Create New Destination'}</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingDestination(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6">
                <DestinationForm
                  destination={editingDestination}
                  toast={toastApi}
                  onSave={handleSaveDestination}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingDestination(null);
                  }}
                  isSaving={isSaving}
                />
              </div>
            </div>
          </>
        )}

          <ConfirmDialogComponent />
        </div>
      </div>
    </main>
  );
}
