'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileDown, Loader2, Shield, Trash2 } from 'lucide-react';

interface ExportRequest {
  id: string;
  status: string;
  file_url?: string | null;
  processed_at?: string | null;
  created_at: string;
  last_error?: string | null;
  email_sent_at?: string | null;
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
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [exportsLoading, setExportsLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [deletionReason, setDeletionReason] = useState('');
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);

  useEffect(() => {
    loadPrivacy();
    loadExportRequests();
  }, []);

  async function loadPrivacy() {
    try {
      setPrivacyLoading(true);
      const response = await fetch('/api/account/profile');
      if (!response.ok) {
        throw new Error('Failed to load privacy preferences');
      }
      const data = await response.json();
      setPrivacy({
        privacy_mode: data.profile?.privacy_mode ?? false,
        allow_tracking: data.profile?.allow_tracking ?? true,
        email_notifications: data.profile?.email_notifications ?? true,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[privacy] Failed to load preferences', error);
      setPrivacyError(message);
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function persistPrivacy(update: Partial<PrivacyState>) {
    setPrivacy(prev => ({ ...prev, ...update }));
    setPrivacySaving(true);
    setPrivacyMessage(null);
    setPrivacyError(null);

    try {
      const response = await fetch('/api/account/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update privacy');
      }

      setPrivacyMessage('Privacy preferences updated');
      setTimeout(() => setPrivacyMessage(null), 4000);
    } catch (error) {
      const message = getErrorMessage(error) || 'Failed to update privacy preferences';
      console.error('[privacy] Failed to update preferences', error);
      setPrivacyError(message);
    } finally {
      setPrivacySaving(false);
    }
  }

  async function loadExportRequests() {
    try {
      setExportsLoading(true);
      setExportError(null);
      const response = await fetch('/api/account/export');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load export requests');
      }
      setExportRequests(data.requests || []);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[privacy] Failed to load export requests', error);
      setExportError(message);
    } finally {
      setExportsLoading(false);
    }
  }

  async function handleExportRequest() {
    try {
      setExportStatus('Submitting request…');
      setExportError(null);
      const response = await fetch('/api/account/export?create=true');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to queue export');
      }
      await loadExportRequests();
      setExportStatus('Export request queued. Watch your inbox for a link.');
      setTimeout(() => setExportStatus(null), 6000);
    } catch (error) {
      const message = getErrorMessage(error) || 'Failed to queue export';
      console.error('[privacy] Failed to queue export', error);
      setExportError(message);
    }
  }

  async function handleDeletionRequest() {
    if (deletionSubmitting) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('This will permanently delete your account, saved places, and trips. Continue?')
      : true;

    if (!confirmed) return;

    try {
      setDeletionSubmitting(true);
      setDeletionError(null);
      setDeletionStatus(null);

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deletionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request deletion');
      }

      setDeletionStatus('Account deletion has been requested. We will email you once it is complete.');
      setDeletionReason('');
    } catch (error) {
      const message = getErrorMessage(error) || 'Failed to request deletion';
      console.error('[privacy] Failed to queue deletion', error);
      setDeletionError(message);
    } finally {
      setDeletionSubmitting(false);
    }
  }

  const latestComplete = exportRequests.find((req) => req.status === 'complete' && req.file_url);

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Privacy Controls</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle how we handle personalization and notifications.</p>
          </div>
        </div>

        {privacyError && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {privacyError}
          </div>
        )}
        {privacyMessage && (
          <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
            {privacyMessage}
          </div>
        )}

        <div className="space-y-3">
          <PreferenceToggle
            label="Privacy mode"
            description="Hide your activity from other members and discovery surfaces."
            checked={privacy.privacy_mode}
            disabled={privacyLoading || privacySaving}
            onChange={(value) => persistPrivacy({ privacy_mode: value })}
          />
          <PreferenceToggle
            label="Allow tracking for better recommendations"
            description="Share anonymous engagement data to help our models improve."
            checked={privacy.allow_tracking}
            disabled={privacyLoading || privacySaving}
            onChange={(value) => persistPrivacy({ allow_tracking: value })}
          />
          <PreferenceToggle
            label="Email notifications"
            description="Receive trip updates, export notifications, and privacy confirmations."
            checked={privacy.email_notifications}
            disabled={privacyLoading || privacySaving}
            onChange={(value) => persistPrivacy({ email_notifications: value })}
          />
        </div>

        {privacySaving && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving changes…
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <FileDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Data Export</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Download everything we know about your account.</p>
          </div>
        </div>

        {exportError && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {exportError}
          </div>
        )}
        {exportStatus && (
          <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 text-sm">
            {exportStatus}
          </div>
        )}

        <button
          onClick={handleExportRequest}
          disabled={exportsLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md"
        >
          <FileDown className="h-4 w-4" />
          Request new export
        </button>

        {latestComplete && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium">Latest export:</p>
            <a
              href={latestComplete.file_url || '#'}
              download="urban-manual-export.json"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              Download JSON archive
            </a>
            <p className="text-xs text-gray-400">
              Processed {formatDate(latestComplete.processed_at || latestComplete.created_at)}
            </p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-2">Recent requests</p>
          <div className="space-y-2">
            {exportsLoading && <p className="text-sm text-gray-500">Loading export history…</p>}
            {!exportsLoading && exportRequests.length === 0 && (
              <p className="text-sm text-gray-500">No export history yet.</p>
            )}
            {exportRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between text-sm border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2">
                <div>
                  <p className="font-medium">{formatDate(req.created_at)}</p>
                  <p className="text-xs text-gray-500">Status: {req.status}</p>
                  {req.last_error && <p className="text-xs text-red-500">{req.last_error}</p>}
                </div>
                {req.file_url && req.status === 'complete' && (
                  <a
                    href={req.file_url}
                    download="urban-manual-export.json"
                    className="text-xs text-blue-600 dark:text-blue-400 underline"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-900 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete account</h3>
            <p className="text-sm text-red-600 dark:text-red-400">This action is permanent.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p>
            We will queue your deletion request, remove saved places, trips, personalization data, and permanently delete your Supabase user record. You will receive a confirmation email when processing is complete.
          </p>
        </div>

        {deletionError && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {deletionError}
          </div>
        )}
        {deletionStatus && (
          <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
            {deletionStatus}
          </div>
        )}

        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tell us why (optional)</label>
        <textarea
          value={deletionReason}
          onChange={(e) => setDeletionReason(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Feedback helps us improve before your account disappears forever."
        />

        <button
          onClick={handleDeletionRequest}
          disabled={deletionSubmitting}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 dark:bg-red-500 text-white text-sm font-semibold hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md"
        >
          {deletionSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Request account deletion
        </button>
      </section>
    </div>
  );
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function PreferenceToggle({ label, description, checked, disabled, onChange }: PreferenceToggleProps) {
  return (
    <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
      checked 
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30' 
        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </label>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Unexpected error';
}
