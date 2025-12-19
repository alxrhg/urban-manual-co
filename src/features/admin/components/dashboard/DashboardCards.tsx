'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Check,
  ArrowRight,
  FileText,
  Bell,
  AtSign,
  MessageSquare,
  CheckCircle,
  Star,
  Calendar,
  Package,
  MapPin,
  Clock,
  Image as ImageIcon,
  Sparkles,
  Database,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/ui/skeleton';

// Types
interface SetupStep {
  id: string;
  title: string;
  completed: boolean;
  href?: string;
}

interface ActivityItem {
  id: string;
  name: string;
  type: string;
  studio: string;
  timestamp: string;
}

interface RecentApp {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  href: string;
}

interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'task';
  message: string;
  read: boolean;
}

// Setup Card - Onboarding checklist
export function SetupCard({ onDismiss }: { onDismiss?: () => void }) {
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: '1', title: 'Review destinations in your database', completed: true, href: '/admin/destinations' },
    { id: '2', title: 'Enrich destinations with Google data', completed: false, href: '/admin/enrich' },
    { id: '3', title: 'Reindex for AI-powered search', completed: false, href: '/admin/reindex' },
  ]);

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check actual completion status
    const checkStatus = async () => {
      const [
        { count: enrichedCount },
        { count: totalCount },
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
      ]);

      const enrichmentRatio = (enrichedCount || 0) / (totalCount || 1);

      setSteps(prev => prev.map(step => {
        if (step.id === '2') {
          return { ...step, completed: enrichmentRatio > 0.5 };
        }
        return step;
      }));
    };

    checkStatus();
  }, []);

  const completedCount = steps.filter(s => s.completed).length;
  const remainingCount = steps.length - completedCount;

  if (dismissed) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-black dark:text-white">Dashboard setup</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You have {remainingCount} {remainingCount === 1 ? 'step' : 'steps'} to complete to enable full Dashboard
            functionality
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            href={step.href || '#'}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-colors',
              step.completed
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                step.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              )}
            >
              {step.completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                'text-sm flex-1',
                step.completed
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {step.title}
            </span>
            {!step.completed && (
              <ArrowRight className="w-4 h-4 text-gray-400" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Recent Apps Card
export function RecentAppsCard() {
  const apps: RecentApp[] = [
    { id: '1', name: 'Urban Manual CMS', color: '#f97316', href: '/admin/destinations' },
    { id: '2', name: 'Analytics', icon: 'chart', href: '/admin/analytics' },
    { id: '3', name: 'Urban Manual', color: '#f97316', href: '/' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-black dark:text-white">Recent tools</h3>
        <Link
          href="/admin"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: app.color || '#6b7280' }}
            >
              {app.name.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{app.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Activity Card
export function ActivityCard() {
  const [activeTab, setActiveTab] = useState<'recent' | 'others'>('recent');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data } = await supabase
          .from('destinations')
          .select('id, name, city, category, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (data) {
          setActivities(
            data.map((d) => ({
              id: String(d.id),
              name: d.name,
              type: 'Destination',
              studio: 'Urban Manual CMS',
              timestamp: getRelativeTime(new Date(d.updated_at)),
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-base font-medium text-black dark:text-white mb-4">Activity</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={() => setActiveTab('recent')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
            activeTab === 'recent'
              ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Your recently viewed
        </button>
        <button
          onClick={() => setActiveTab('others')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
            activeTab === 'others'
              ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          What others are working on
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : (
          activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/admin/destinations`}
              className="py-3 flex items-center gap-3 group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-black dark:text-white truncate group-hover:opacity-70 transition-opacity">
                  {activity.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.studio}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{activity.type}</p>
                <p className="text-xs text-gray-400">{activity.timestamp}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// Notifications Card
export function NotificationsCard() {
  const [notifications] = useState<Notification[]>([]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-base font-medium text-black dark:text-white mb-4">Notifications</h3>

      {notifications.length === 0 ? (
        <div className="py-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You have no new notifications
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.map((notification) => (
            <div key={notification.id} className="py-3 flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {notification.type === 'mention' && <AtSign className="w-4 h-4 text-gray-400" />}
                {notification.type === 'reply' && <MessageSquare className="w-4 h-4 text-gray-400" />}
                {notification.type === 'task' && <CheckCircle className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{notification.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          View items that need your attention in one place.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <AtSign className="w-4 h-4" />
            <span>Mentions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-4 h-4" />
            <span>Replies</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4" />
            <span>Tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Favorites Card
export function FavoritesCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-base font-medium text-black dark:text-white mb-4">Favorites</h3>

      <div className="py-6 text-center">
        <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800">
          <Star className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You have not favorited any content
        </p>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Look for the star next to your document titles and favorite content to quickly access it here, saving time and streamlining your workflows.
      </p>
    </div>
  );
}

// Releases Card
export function ReleasesCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-base font-medium text-black dark:text-white mb-4">Releases</h3>

      <div className="py-6 text-center">
        <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800">
          <Package className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You have no releases
        </p>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Bundle related content changes together, preview how they'll appear as a cohesive unit, and push out the updates simultaneously.
      </p>
    </div>
  );
}

// Quick Stats Card (Adapted from original)
export function QuickStatsCard() {
  const [stats, setStats] = useState<{
    destinations: number;
    enriched: number;
    missingImages: number;
    notEnriched: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: destinations },
          { count: enriched },
          { count: missingImages },
          { count: notEnriched },
        ] = await Promise.all([
          supabase.from('destinations').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
        ]);

        setStats({
          destinations: destinations || 0,
          enriched: enriched || 0,
          missingImages: missingImages || 0,
          notEnriched: notEnriched || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const items = [
    {
      label: 'Destinations',
      value: stats?.destinations || 0,
      icon: <MapPin className="w-4 h-4 text-blue-500" />,
      href: '/admin/destinations',
    },
    {
      label: 'Enriched',
      value: stats?.enriched || 0,
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      href: '/admin/enrich',
    },
    {
      label: 'Missing Images',
      value: stats?.missingImages || 0,
      icon: <ImageIcon className="w-4 h-4 text-orange-500" />,
      href: '/admin/destinations?filter=no_image',
    },
    {
      label: 'Not Enriched',
      value: stats?.notEnriched || 0,
      icon: <Database className="w-4 h-4 text-gray-500" />,
      href: '/admin/destinations?filter=not_enriched',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-black dark:text-white">Quick stats</h3>
        <Link
          href="/admin/analytics"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {item.icon}
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-lg font-medium text-black dark:text-white tabular-nums">
                {item.value.toLocaleString()}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Helper function
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
