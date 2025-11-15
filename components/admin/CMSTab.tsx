'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Database, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CMSTab() {
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkCMSHealth = async () => {
      try {
        const response = await fetch('/api/sanity-health');
        if (!response.ok) {
          throw new Error('Failed to fetch CMS health status');
        }
        const data = await response.json();
        setHealthStatus(data);
      } catch (err: any) {
        setError(err.message || 'Failed to check CMS health');
      } finally {
        setLoading(false);
      }
    };

    checkCMSHealth();
  }, []);

  const handleOpenSanityCMS = () => {
    router.push('/studio');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  const isHealthy = healthStatus?.environment?.sanity_project_id && 
                    healthStatus?.environment?.sanity_dataset;

  return (
    <div className="space-y-6">
      {/* CMS Status Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold">Sanity CMS</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Content Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Healthy
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Configuration Issue
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sanity CMS provides a powerful, real-time admin interface for managing destinations,
            media, and other content with a flexible content platform.
          </p>

          <button
            onClick={handleOpenSanityCMS}
            className="w-full flex items-center justify-between px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">Open Sanity Studio</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Configuration Details */}
      {healthStatus?.environment && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">Configuration Status</h3>
          <div className="space-y-3">
            <ConfigItem
              label="Sanity Project ID"
              status={healthStatus.environment.sanity_project_id}
              detail={healthStatus.environment.sanity_project_id ? 'Configured' : 'Not configured'}
            />
            <ConfigItem
              label="Sanity Dataset"
              status={healthStatus.environment.sanity_dataset}
              detail={
                healthStatus.environment.sanity_dataset
                  ? healthStatus.environment.sanity_dataset
                  : 'Not configured'
              }
            />
            <ConfigItem
              label="Environment"
              status={true}
              detail={healthStatus.environment.node_env || 'development'}
            />
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-3">About Sanity CMS</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-gray-400 dark:text-gray-600 mt-0.5">•</span>
            <span>
              <strong>Real-time Collaboration:</strong> Edit content with live updates and collaboration
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 dark:text-gray-600 mt-0.5">•</span>
            <span>
              <strong>Flexible Content:</strong> Manage destinations with customizable schemas
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 dark:text-gray-600 mt-0.5">•</span>
            <span>
              <strong>Media Management:</strong> Upload and manage images with built-in CDN
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 dark:text-gray-600 mt-0.5">•</span>
            <span>
              <strong>API-first:</strong> Access content via powerful GROQ queries
            </span>
          </li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/studio/structure/destination')}
            className="px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <div className="text-sm font-medium">Edit Destinations</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage destination content
            </div>
          </button>
          <button
            onClick={() => router.push('/studio/structure/media.image')}
            className="px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <div className="text-sm font-medium">Media Library</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload and manage media
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        {status ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{detail}</span>
    </div>
  );
}
