'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ExportRequest {
  id: string;
  status: string;
  file_url?: string | null;
  processed_at?: string | null;
  created_at: string;
  last_error?: string | null;
}

interface PrivacyState {
  privacy_mode: boolean;
  allow_tracking: boolean;
  email_notifications: boolean;
}

const defaultPrivacy: PrivacyState = {
  privacy_mode: false,
  allow_tracking: true,
  email_notifications: true,
};

export function AccountPrivacyManager() {
  const [privacy, setPrivacy] = useState<PrivacyState>(defaultPrivacy);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [exportsLoading, setExportsLoading] = useState(true);
  const [exportSubmitting, setExportSubmitting] = useState(false);

  const [deletionReason, setDeletionReason] = useState('');
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [showDeletionForm, setShowDeletionForm] = useState(false);

  useEffect(() => {
    loadPrivacy();
    loadExportRequests();
  }, []);

  async function loadPrivacy() {
    try {
      setPrivacyLoading(true);
      const response = await fetch('/api/account/profile');
      if (!response.ok) throw new Error('Failed to load preferences');
      const data = await response.json();
      setPrivacy({
        privacy_mode: data.profile?.privacy_mode ?? false,
        allow_tracking: data.profile?.allow_tracking ?? true,
        email_notifications: data.profile?.email_notifications ?? true,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function persistPrivacy(update: Partial<PrivacyState>) {
    setPrivacy((prev) => ({ ...prev, ...update }));
    setPrivacySaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/account/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      setMessage({ type: 'success', text: 'Preferences updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setPrivacySaving(false);
    }
  }

  async function loadExportRequests() {
    try {
      setExportsLoading(true);
      const response = await fetch('/api/account/export');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load');
      setExportRequests(data.requests || []);
    } catch (error) {
      console.error('[privacy] Failed to load exports', error);
    } finally {
      setExportsLoading(false);
    }
  }

  async function handleExportRequest() {
    try {
      setExportSubmitting(true);
      setMessage(null);
      const response = await fetch('/api/account/export?create=true');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request export');
      }
      await loadExportRequests();
      setMessage({ type: 'success', text: 'Export queued. Check your email.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setExportSubmitting(false);
    }
  }

  async function handleDeletionRequest() {
    if (deletionSubmitting) return;
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;

    try {
      setDeletionSubmitting(true);
      setMessage(null);

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deletionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errors?.[0]?.message || data.error || 'Failed to request deletion');
      }

      setMessage({ type: 'success', text: 'Deletion requested. Check your email for confirmation.' });
      setDeletionReason('');
      setShowDeletionForm(false);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setDeletionSubmitting(false);
    }
  }

  const latestExport = exportRequests.find((r) => r.status === 'complete' && r.file_url);

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      {/* Privacy Controls */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <p className="text-sm font-medium mb-4">Privacy</p>
        <div className="space-y-4">
          <PrivacyToggle
            label="Privacy mode"
            description="Hide activity from other members"
            checked={privacy.privacy_mode}
            disabled={privacyLoading || privacySaving}
            onChange={(v) => persistPrivacy({ privacy_mode: v })}
          />
          <PrivacyToggle
            label="Analytics"
            description="Share anonymous data for better recommendations"
            checked={privacy.allow_tracking}
            disabled={privacyLoading || privacySaving}
            onChange={(v) => persistPrivacy({ allow_tracking: v })}
          />
          <PrivacyToggle
            label="Email notifications"
            description="Receive updates about trips and exports"
            checked={privacy.email_notifications}
            disabled={privacyLoading || privacySaving}
            onChange={(v) => persistPrivacy({ email_notifications: v })}
          />
        </div>
      </div>

      {/* Data Export */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Data Export</p>
            <p className="text-sm text-gray-500 mt-0.5">Download your account data as JSON</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportRequest}
            disabled={exportSubmitting || exportsLoading}
            className="text-xs text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50"
          >
            {exportSubmitting ? 'Requesting...' : 'Request export'}
          </button>

          {latestExport && (
            <a
              href={latestExport.file_url || '#'}
              download="urban-manual-export.json"
              className="text-xs text-blue-600 hover:underline"
            >
              Download latest ({formatDate(latestExport.processed_at || latestExport.created_at)})
            </a>
          )}
        </div>

        {exportRequests.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Recent requests</p>
            <div className="space-y-1">
              {exportRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(req.created_at)}</span>
                  <span className={req.status === 'complete' ? 'text-green-600' : ''}>{req.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account Deletion */}
      <div className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-600">Delete Account</p>
            <p className="text-sm text-gray-500 mt-0.5">Permanently remove your account and data</p>
          </div>
        </div>

        {showDeletionForm ? (
          <div className="mt-4 space-y-3">
            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none"
              placeholder="Why are you leaving? (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeletionForm(false);
                  setDeletionReason('');
                }}
                className="text-sm text-gray-500 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletionRequest}
                disabled={deletionSubmitting}
                className="text-sm text-red-600 font-medium hover:opacity-70 disabled:opacity-50"
              >
                {deletionSubmitting ? 'Requesting...' : 'Confirm deletion'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeletionForm(true)}
            className="text-xs text-red-600 hover:underline mt-2"
          >
            Delete my account
          </button>
        )}
      </div>
    </div>
  );
}

interface PrivacyToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function PrivacyToggle({ label, description, checked, disabled, onChange }: PrivacyToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-black dark:accent-white"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An error occurred';
}
