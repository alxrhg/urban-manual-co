'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LinkedProvider {
  id: string;
  provider: string;
  identity_data: {
    email?: string;
    name?: string;
  };
}

interface MfaFactor {
  id: string;
  friendly_name: string;
  status: 'verified' | 'unverified';
  created_at: string;
}

interface SecurityData {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  linkedProviders: LinkedProvider[];
  mfa: {
    enabled: boolean;
    factors: MfaFactor[];
  };
  lastSignIn: string;
}

export function SecuritySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Email form
  const [newEmail, setNewEmail] = useState('');

  // MFA
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    try {
      setLoading(true);
      const response = await fetch('/api/account/security');
      if (!response.ok) throw new Error('Failed to load security settings');
      setData(await response.json());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string, body: Record<string, any> = {}) {
    try {
      setActionLoading(action);
      setMessage(null);

      const response = await fetch('/api/account/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.errors?.[0]?.message || result.error || 'Action failed');
      }

      if (result.url) {
        window.location.href = result.url;
        return result;
      }

      setMessage({ type: 'success', text: result.message });
      await loadSecurityData();
      return result;
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
      throw err;
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    try {
      await handleAction('update_password', {
        currentPassword: data?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditingField(null);
    } catch {}
  }

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email' });
      return;
    }
    try {
      await handleAction('update_email', { newEmail });
      setNewEmail('');
      setEditingField(null);
    } catch {}
  }

  async function handleEnrollMfa() {
    try {
      const result = await handleAction('enroll_mfa');
      setMfaQrCode(result.qrCode);
      setMfaSecret(result.secret);
      setMfaFactorId(result.factorId);
      setEditingField('mfa');
    } catch {}
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length !== 6) return;
    try {
      await handleAction('verify_mfa', { factorId: mfaFactorId, code: mfaCode });
      setMfaQrCode(null);
      setMfaSecret(null);
      setMfaFactorId(null);
      setMfaCode('');
      setEditingField(null);
    } catch {}
  }

  async function handleSignOutAll() {
    if (!confirm('Sign out from all devices?')) return;
    try {
      setActionLoading('sign_out_all');
      const response = await fetch('/api/account/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign_out_all' }),
      });
      if (!response.ok) throw new Error('Failed to sign out');
      router.push('/auth/login');
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error || 'Failed to load'}</p>;
  }

  const appleIdentity = data.linkedProviders.find((p) => p.provider === 'apple');

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      {/* Email */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-gray-500 mt-0.5">{data.email}</p>
            {!data.emailVerified && (
              <button
                onClick={() => handleAction('resend_verification')}
                disabled={actionLoading === 'resend_verification'}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {actionLoading === 'resend_verification' ? 'Sending...' : 'Verify email'}
              </button>
            )}
          </div>
          {data.emailVerified ? (
            <span className="text-xs text-green-600">Verified</span>
          ) : (
            <span className="text-xs text-yellow-600">Unverified</span>
          )}
        </div>

        {editingField === 'email' ? (
          <form onSubmit={handleEmailUpdate} className="mt-4 space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditingField(null); setNewEmail(''); }}
                className="text-sm text-gray-500 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'update_email'}
                className="text-sm font-medium hover:opacity-70"
              >
                {actionLoading === 'update_email' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setEditingField('email')}
            className="text-xs text-gray-500 hover:text-black dark:hover:text-white mt-2"
          >
            Change email
          </button>
        )}
      </div>

      {/* Password */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {data.hasPassword ? '••••••••' : 'No password set'}
            </p>
          </div>
        </div>

        {editingField === 'password' ? (
          <form onSubmit={handlePasswordUpdate} className="mt-4 space-y-3">
            {data.hasPassword && (
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 pr-10 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingField(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-sm text-gray-500 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'update_password'}
                className="text-sm font-medium hover:opacity-70"
              >
                {actionLoading === 'update_password' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => setEditingField('password')}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white"
            >
              {data.hasPassword ? 'Change password' : 'Set password'}
            </button>
            {data.hasPassword && (
              <button
                onClick={() => handleAction('request_password_reset')}
                disabled={actionLoading === 'request_password_reset'}
                className="text-xs text-gray-500 hover:text-black dark:hover:text-white"
              >
                {actionLoading === 'request_password_reset' ? 'Sending...' : 'Forgot password'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Linked Accounts */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <p className="text-sm font-medium mb-3">Linked Accounts</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            </div>
            <div>
              <p className="text-sm">Apple</p>
              {appleIdentity && (
                <p className="text-xs text-gray-500">{appleIdentity.identity_data.email || 'Connected'}</p>
              )}
            </div>
          </div>
          {appleIdentity ? (
            <button
              onClick={() => {
                if (confirm('Unlink Apple account?')) {
                  handleAction('unlink_provider', { identityId: appleIdentity.id });
                }
              }}
              disabled={actionLoading === 'unlink_provider'}
              className="text-xs text-red-600 hover:underline"
            >
              {actionLoading === 'unlink_provider' ? 'Unlinking...' : 'Unlink'}
            </button>
          ) : (
            <button
              onClick={() => handleAction('link_provider', { provider: 'apple' })}
              disabled={actionLoading === 'link_provider'}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white"
            >
              {actionLoading === 'link_provider' ? 'Linking...' : 'Link'}
            </button>
          )}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {data.mfa.enabled ? 'Enabled via authenticator app' : 'Not enabled'}
            </p>
          </div>
          {data.mfa.enabled && <span className="text-xs text-green-600">Active</span>}
        </div>

        {editingField === 'mfa' && mfaQrCode ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scan with your authenticator app:
            </p>
            <div className="flex justify-center bg-white p-4 rounded-lg w-fit">
              <img src={mfaQrCode} alt="MFA QR Code" className="w-40 h-40" />
            </div>
            {mfaSecret && (
              <p className="text-xs text-gray-500">
                Manual entry: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{mfaSecret}</code>
              </p>
            )}
            <form onSubmit={handleVerifyMfa} className="space-y-3">
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-transparent text-sm text-center font-mono tracking-widest focus:outline-none focus:border-black dark:focus:border-white"
                maxLength={6}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(null);
                    setMfaQrCode(null);
                    setMfaSecret(null);
                    setMfaFactorId(null);
                    setMfaCode('');
                  }}
                  className="text-sm text-gray-500 hover:text-black dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'verify_mfa' || mfaCode.length !== 6}
                  className="text-sm font-medium hover:opacity-70 disabled:opacity-50"
                >
                  {actionLoading === 'verify_mfa' ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        ) : data.mfa.enabled ? (
          <button
            onClick={() => {
              const factor = data.mfa.factors[0];
              if (factor && confirm('Disable two-factor authentication?')) {
                handleAction('unenroll_mfa', { factorId: factor.id });
              }
            }}
            disabled={actionLoading === 'unenroll_mfa'}
            className="text-xs text-red-600 hover:underline mt-2"
          >
            {actionLoading === 'unenroll_mfa' ? 'Disabling...' : 'Disable'}
          </button>
        ) : (
          <button
            onClick={handleEnrollMfa}
            disabled={actionLoading === 'enroll_mfa'}
            className="text-xs text-gray-500 hover:text-black dark:hover:text-white mt-2"
          >
            {actionLoading === 'enroll_mfa' ? 'Setting up...' : 'Enable'}
          </button>
        )}
      </div>

      {/* Sessions */}
      <div className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sessions</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Last sign in: {data.lastSignIn ? new Date(data.lastSignIn).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOutAll}
          disabled={actionLoading === 'sign_out_all'}
          className="text-xs text-red-600 hover:underline mt-2"
        >
          {actionLoading === 'sign_out_all' ? 'Signing out...' : 'Sign out all devices'}
        </button>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
