'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface NotificationSettings {
  emailUpdates: boolean;
  productAnnouncements: boolean;
  travelAlerts: boolean;
  communityHighlights: boolean;
}

export interface ConnectedServicesSettings {
  google: boolean;
  apple: boolean;
  instagram: boolean;
  calendarSync: boolean;
}

export interface PrivacySettings {
  isPublic: boolean;
  privacyMode: boolean;
  allowTracking: boolean;
  showActivity: boolean;
}

export interface SavedPlaceSummary {
  destination_slug: string;
  destination: {
    name: string;
    city: string;
    category: string;
    image: string;
  };
}

export interface VisitedPlaceSummary {
  destination_slug: string;
  visited_at: string;
  rating?: number | null;
  notes?: string | null;
  destination: {
    name: string;
    city: string;
    category: string;
    image: string;
    latitude?: number | null;
    longitude?: number | null;
    country?: string | null;
  };
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_public: boolean;
  destination_count?: number | null;
}

export interface SessionRecord {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  location_city?: string | null;
  location_country?: string | null;
  device_type?: string | null;
  referrer?: string | null;
  last_activity?: string | null;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  created_at: string;
  description?: string | null;
  destination_slug?: string | null;
  metadata?: Record<string, any> | null;
}

interface AccountState {
  session: Session | null;
  user: User | null;
  profile: Record<string, any> | null;
  preferences: Record<string, any> | null;
  savedPlaces: SavedPlaceSummary[];
  visitedPlaces: VisitedPlaceSummary[];
  collections: CollectionSummary[];
  visitedCountries: Array<{ country_code: string; country_name: string }>;
  totalDestinations: number;
  notificationSettings: NotificationSettings;
  connectedServices: ConnectedServicesSettings;
  privacySettings: PrivacySettings;
  sessions: SessionRecord[];
  activityLog: ActivityLogEntry[];
  loading: boolean;
  error: string | null;
}

interface UserContextValue extends AccountState {
  refreshAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  updatePrivacySettings: (settings: PrivacySettings) => Promise<void>;
  updateConnectedServices: (settings: ConnectedServicesSettings) => Promise<void>;
  signOutOtherDevices: () => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
}

const defaultNotificationSettings: NotificationSettings = {
  emailUpdates: true,
  productAnnouncements: true,
  travelAlerts: true,
  communityHighlights: false,
};

const defaultConnectedServices: ConnectedServicesSettings = {
  google: false,
  apple: false,
  instagram: false,
  calendarSync: false,
};

const defaultPrivacySettings: PrivacySettings = {
  isPublic: true,
  privacyMode: false,
  allowTracking: true,
  showActivity: true,
};

const initialState: AccountState = {
  session: null,
  user: null,
  profile: null,
  preferences: null,
  savedPlaces: [],
  visitedPlaces: [],
  collections: [],
  visitedCountries: [],
  totalDestinations: 0,
  notificationSettings: defaultNotificationSettings,
  connectedServices: defaultConnectedServices,
  privacySettings: defaultPrivacySettings,
  sessions: [],
  activityLog: [],
  loading: true,
  error: null,
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body && (body.error || body.message)) || 'Unable to load data';
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccountState>(initialState);

  const setPartialState = useCallback((partial: Partial<AccountState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const loadSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[UserContext] Failed to get session', error);
      setPartialState({ session: null, user: null });
      return null;
    }

    const session = data?.session || null;
    setPartialState({ session, user: session?.user ?? null });
    return session;
  }, [setPartialState]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchJson<{ profile: Record<string, any> | null }>(
        '/api/account/profile'
      );
      setPartialState({ profile: data.profile || null });
    } catch (error) {
      console.error('[UserContext] Failed to load profile', error);
      setPartialState({ profile: null });
    }
  }, [setPartialState]);

  const loadPreferences = useCallback(async () => {
    try {
      const data = await fetchJson<{ preferences: Record<string, any> | null }>(
        '/api/account/preferences'
      );
      setPartialState({ preferences: data.preferences || null });
    } catch (error) {
      console.error('[UserContext] Failed to load preferences', error);
      setPartialState({ preferences: null });
    }
  }, [setPartialState]);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const data = await fetchJson<{ settings: NotificationSettings }>(
        '/api/account/settings/notifications'
      );
      setPartialState({ notificationSettings: data.settings });
    } catch (error) {
      console.error('[UserContext] Failed to load notification settings', error);
      setPartialState({ notificationSettings: defaultNotificationSettings });
    }
  }, [setPartialState]);

  const loadPrivacySettings = useCallback(async () => {
    try {
      const data = await fetchJson<{ settings: PrivacySettings }>(
        '/api/account/settings/privacy'
      );
      setPartialState({ privacySettings: data.settings });
    } catch (error) {
      console.error('[UserContext] Failed to load privacy settings', error);
      setPartialState({ privacySettings: defaultPrivacySettings });
    }
  }, [setPartialState]);

  const loadConnectedServices = useCallback(async () => {
    try {
      const data = await fetchJson<{ settings: ConnectedServicesSettings }>(
        '/api/account/settings/services'
      );
      setPartialState({ connectedServices: data.settings });
    } catch (error) {
      console.error('[UserContext] Failed to load connected services', error);
      setPartialState({ connectedServices: defaultConnectedServices });
    }
  }, [setPartialState]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchJson<{ sessions: SessionRecord[] }>(
        '/api/account/sessions'
      );
      setPartialState({ sessions: data.sessions });
    } catch (error) {
      console.error('[UserContext] Failed to load sessions', error);
      setPartialState({ sessions: [] });
    }
  }, [setPartialState]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await fetchJson<{ activity: ActivityLogEntry[] }>(
        '/api/account/activity'
      );
      setPartialState({ activityLog: data.activity });
    } catch (error) {
      console.error('[UserContext] Failed to load activity log', error);
      setPartialState({ activityLog: [] });
    }
  }, [setPartialState]);

  const loadPlacesData = useCallback(async (userId: string) => {
    try {
      const [savedResult, visitedResult, collectionsResult, countriesResponse] = await Promise.all([
        supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', userId),
        supabase
          .from('visited_places')
          .select('destination_slug, visited_at, rating, notes')
          .eq('user_id', userId)
          .order('visited_at', { ascending: false }),
        supabase
          .from('collections')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        fetch('/api/visited-countries', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        }).catch(error => {
          console.error('[UserContext] Failed to load visited countries', error);
          return null;
        }),
      ]);

      const allSlugs = new Set<string>();

      if (savedResult.data) {
        (savedResult.data as any[]).forEach(item => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as any[]).forEach(item => allSlugs.add(item.destination_slug));
      }

      let destinations: any[] = [];
      if (allSlugs.size > 0) {
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));
        if (destData) {
          destinations = destData as any[];
        }
      }

      const savedPlaces: SavedPlaceSummary[] = (savedResult.data || [])
        .map((item: any) => {
          const dest = destinations.find(destItem => destItem.slug === item.destination_slug);
          if (!dest) return null;
          return {
            destination_slug: item.destination_slug,
            destination: {
              name: dest.name,
              city: dest.city,
              category: dest.category,
              image: dest.image,
            },
          };
        })
        .filter(Boolean) as SavedPlaceSummary[];

      const visitedPlaces: VisitedPlaceSummary[] = (visitedResult.data || [])
        .map((item: any) => {
          const dest = destinations.find(destItem => destItem.slug === item.destination_slug);
          if (!dest) return null;
          return {
            destination_slug: item.destination_slug,
            visited_at: item.visited_at,
            rating: item.rating,
            notes: item.notes,
            destination: {
              name: dest.name,
              city: dest.city,
              category: dest.category,
              image: dest.image,
              latitude: dest.latitude,
              longitude: dest.longitude,
              country: dest.country,
            },
          };
        })
        .filter(Boolean) as VisitedPlaceSummary[];

      const visitedCountriesApi = countriesResponse && 'ok' in countriesResponse && countriesResponse.ok
        ? ((await countriesResponse.json())?.countries || [])
        : [];

      const { count } = await supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true });

      setPartialState({
        savedPlaces,
        visitedPlaces,
        collections: (collectionsResult.data as any[])?.map(collection => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          created_at: collection.created_at,
          is_public: collection.is_public,
          destination_count: collection.destination_count,
        })) || [],
        visitedCountries: visitedCountriesApi,
        totalDestinations: count || 0,
      });
    } catch (error) {
      console.error('[UserContext] Failed to load places data', error);
      setPartialState({
        savedPlaces: [],
        visitedPlaces: [],
        collections: [],
        visitedCountries: [],
      });
    }
  }, [setPartialState]);

  const loadAll = useCallback(async () => {
    setPartialState({ loading: true, error: null });
    try {
      const session = await loadSession();
      const userId = session?.user?.id;
      if (!session || !userId) {
        setPartialState({ loading: false });
        return;
      }

      await Promise.all([
        loadProfile(),
        loadPreferences(),
        loadNotificationSettings(),
        loadPrivacySettings(),
        loadConnectedServices(),
        loadSessions(),
        loadActivity(),
        loadPlacesData(userId),
      ]);
      setPartialState({ loading: false });
    } catch (error) {
      console.error('[UserContext] Failed to load account data', error);
      setPartialState({ loading: false, error: error instanceof Error ? error.message : 'Failed to load account data' });
    }
  }, [
    loadSession,
    loadProfile,
    loadPreferences,
    loadNotificationSettings,
    loadPrivacySettings,
    loadConnectedServices,
    loadSessions,
    loadActivity,
    loadPlacesData,
    setPartialState,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setPartialState({ session: session ?? null, user: session?.user ?? null });
      if (session?.user?.id) {
        loadAll();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadAll, setPartialState]);

  const refreshAll = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const refreshSessions = useCallback(async () => {
    await loadSessions();
    await loadActivity();
  }, [loadSessions, loadActivity]);

  const updateNotificationSettings = useCallback(
    async (settings: NotificationSettings) => {
      await fetchJson('/api/account/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setPartialState({ notificationSettings: settings });
    },
    [setPartialState]
  );

  const updatePrivacySettings = useCallback(
    async (settings: PrivacySettings) => {
      await fetchJson('/api/account/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setPartialState({ privacySettings: settings });
      await loadActivity();
    },
    [setPartialState, loadActivity]
  );

  const updateConnectedServices = useCallback(
    async (settings: ConnectedServicesSettings) => {
      await fetchJson('/api/account/settings/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setPartialState({ connectedServices: settings });
    },
    [setPartialState]
  );

  const signOutOtherDevices = useCallback(async () => {
    await fetchJson('/api/account/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'others' }),
    });
    await refreshSessions();
  }, [refreshSessions]);

  const endSession = useCallback(
    async (sessionId: string) => {
      await fetchJson('/api/account/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      await refreshSessions();
    },
    [refreshSessions]
  );

  const value = useMemo<UserContextValue>(() => ({
    ...state,
    refreshAll,
    refreshProfile,
    refreshSessions,
    updateNotificationSettings,
    updatePrivacySettings,
    updateConnectedServices,
    signOutOtherDevices,
    endSession,
  }), [
    state,
    refreshAll,
    refreshProfile,
    refreshSessions,
    updateNotificationSettings,
    updatePrivacySettings,
    updateConnectedServices,
    signOutOtherDevices,
    endSession,
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
