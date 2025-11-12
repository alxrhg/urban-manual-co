'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import DiscoverTab from '@/components/admin/DiscoverTab';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { DataTable } from './components/DataTable';
import { createColumns, type Destination } from './components/columns';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

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
      toast.error(error instanceof Error ? error.message : 'Failed to load destinations');
      setDestinations([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [authChecked, isAdmin, searchQuery, toast]);

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
      toast.error('Failed to load analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [toast]);

  const loadSearchLogs = useCallback(async () => {
    setLoadingSearches(true);
    try {
      const logs = await fetchSearchLogs();
      setSearchLogs(logs);
      setHasLoadedSearches(true);
    } catch (error) {
      console.error('[Admin] Failed to load search logs', error);
      toast.error('Failed to load search logs');
      setSearchLogs([]);
    } finally {
      setLoadingSearches(false);
    }
  }, [toast]);

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
            toast.success(`Successfully deleted "${name}"`);
            await refreshDestinations();
          } catch (error) {
            console.error('[Admin] Delete error:', error);
            toast.error(error instanceof Error ? `Failed to delete: ${error.message}` : 'Failed to delete destination');
          }
        },
      });
    },
    [confirm, refreshDestinations, toast]
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
        toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
      } catch (error) {
        console.error('[Admin] Save error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save destination');
      } finally {
        setIsSaving(false);
      }
    },
    [editingDestination, refreshDestinations, toast]
  );

  const tableColumns = useMemo(
    () =>
      createColumns(
        (destination: Destination) => {
          setEditingDestination(destination);
          setShowForm(true);
        },
        handleDeleteDestination
      ),
    [handleDeleteDestination]
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

  return (
    <main className="px-6 md:px-10 py-20 min-h-screen">
      <div className="container mx-auto">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Admin</h1>
            <button
              onClick={() => router.push('/account')}
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Back to Account
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
        </div>

        <div className="mb-12">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs border-b border-gray-200 dark:border-gray-800 pb-3">
            {(['destinations', 'analytics', 'searches', 'discover'] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`transition-all pb-1 ${
                  activeTab === tab
                    ? 'font-medium text-black dark:text-white border-b-2 border-black dark:border-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'destinations' && (
          <div className="fade-in space-y-12">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Destinations</h2>
                <button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowForm(true);
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-xs font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Place
                </button>
              </div>
              <DataTable
                columns={tableColumns}
                data={destinations}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoading={isLoadingList}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="fade-in space-y-12">
            {loadingAnalytics ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalViews.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Views</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalSearches.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Searches</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalSaves.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Saves</div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <div className="text-2xl font-light mb-1">{analyticsStats.totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Users</div>
                  </div>
                </div>

                {analyticsStats.topSearches.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Top Search Queries</h2>
                    <div className="space-y-2">
                      {analyticsStats.topSearches.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-2xl"
                        >
                          <span className="text-sm font-medium">{item.query}</span>
                          <span className="text-xs text-gray-500">{item.count} searches</span>
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
          <div className="fade-in">
            {loadingSearches ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : searchLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No search logs available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2 pr-4 font-medium text-gray-500">Time</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">User</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Query</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">City</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Category</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Count</th>
                      <th className="py-2 pr-4 font-medium text-gray-500">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLogs.map((log) => {
                      const metadata = isRecord(log.metadata) ? log.metadata : undefined;
                      const query = metadata ? getStringField(metadata, 'query') : '';

                      const intentRecord = metadata && isRecord(metadata.intent) ? metadata.intent : undefined;
                      const filtersRecord = metadata && isRecord(metadata.filters) ? metadata.filters : undefined;

                      const intentCity = intentRecord ? getStringField(intentRecord, 'city') : '';
                      const intentCategory = intentRecord ? getStringField(intentRecord, 'category') : '';
                      const filterCity = filtersRecord ? getStringField(filtersRecord, 'city') : '';
                      const filterCategory = filtersRecord ? getStringField(filtersRecord, 'category') : '';

                      const countValue = metadata?.count;
                      const count =
                        typeof countValue === 'number'
                          ? countValue.toString()
                          : typeof countValue === 'string'
                            ? countValue
                            : '';
                      const source = metadata ? getStringField(metadata, 'source') : '';
                      const displayCity = intentCity || filterCity;
                      const displayCategory = intentCategory || filterCategory;
                      return (
                        <tr
                          key={log.id}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4">{log.user_id ? log.user_id.substring(0, 8) : 'anon'}</td>
                          <td className="py-2 pr-4 max-w-[360px] truncate" title={query}>
                            {query}
                          </td>
                          <td className="py-2 pr-4">{displayCity}</td>
                          <td className="py-2 pr-4">{displayCategory}</td>
                          <td className="py-2 pr-4">{count}</td>
                          <td className="py-2 pr-4">{source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="fade-in">
            <DiscoverTab />
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
                  toast={toast}
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
    </main>
  );
}
