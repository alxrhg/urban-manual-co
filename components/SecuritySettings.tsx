'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Link2,
  Link2Off,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Shield,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface LinkedProvider {
  id: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  identity_data: {
    email?: string;
    name?: string;
  };
}

interface MfaFactor {
  id: string;
  friendly_name: string;
  factor_type: string;
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
  createdAt: string;
}

export function SecuritySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MFA setup
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSaving, setMfaSaving] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    try {
      setLoading(true);
      const response = await fetch('/api/account/security');
      if (!response.ok) {
        throw new Error('Failed to load security settings');
      }
      const securityData = await response.json();
      setData(securityData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string, body: Record<string, any> = {}) {
    try {
      setActionLoading(action);
      setActionMessage(null);

      const response = await fetch('/api/account/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.message || result.error || 'Action failed');
      }

      // Handle redirect for OAuth linking
      if (result.url) {
        window.location.href = result.url;
        return result;
      }

      setActionMessage({ type: 'success', text: result.message });
      await loadSecurityData();
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setActionMessage({ type: 'error', text: message });
      throw err;
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePasswordReset() {
    await handleAction('request_password_reset');
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setPasswordSaving(true);
      await handleAction('update_password', {
        currentPassword: data?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      setEmailSaving(true);
      await handleAction('update_email', { newEmail });
      setEmailMessage({ type: 'success', text: 'Confirmation email sent. Check your inbox.' });
      setNewEmail('');
      setShowEmailForm(false);
    } catch (err) {
      setEmailMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleResendVerification() {
    await handleAction('resend_verification');
  }

  async function handleLinkProvider(provider: string) {
    await handleAction('link_provider', { provider });
  }

  async function handleUnlinkProvider(identityId: string) {
    if (!confirm('Are you sure you want to unlink this account?')) return;
    await handleAction('unlink_provider', { identityId });
  }

  async function handleEnrollMfa() {
    try {
      setMfaSaving(true);
      setMfaMessage(null);
      const result = await handleAction('enroll_mfa');
      setMfaQrCode(result.qrCode);
      setMfaSecret(result.secret);
      setMfaFactorId(result.factorId);
      setShowMfaSetup(true);
    } catch (err) {
      setMfaMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setMfaSaving(false);
    }
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || !mfaCode) return;

    try {
      setMfaSaving(true);
      await handleAction('verify_mfa', { factorId: mfaFactorId, code: mfaCode });
      setMfaMessage({ type: 'success', text: 'Two-factor authentication enabled' });
      setShowMfaSetup(false);
      setMfaQrCode(null);
      setMfaSecret(null);
      setMfaFactorId(null);
      setMfaCode('');
    } catch (err) {
      setMfaMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setMfaSaving(false);
    }
  }

  async function handleUnenrollMfa(factorId: string) {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) return;
    await handleAction('unenroll_mfa', { factorId });
  }

  async function handleSignOutAll() {
    if (!confirm('This will sign you out from all devices. Continue?')) return;

    try {
      setActionLoading('sign_out_all');
      const response = await fetch('/api/account/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign_out_all' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.errors?.[0]?.message || 'Failed to sign out');
      }

      // Redirect to login
      router.push('/auth/login');
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
        {error || 'Failed to load security settings'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Action Message */}
      {actionMessage && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            actionMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Email & Verification */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Email Address</h3>
            <p className="text-sm text-gray-500">{data.email}</p>
          </div>
          {data.emailVerified ? (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <MailCheck className="h-4 w-4" />
              Verified
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Unverified
            </span>
          )}
        </div>

        {!data.emailVerified && (
          <button
            onClick={handleResendVerification}
            disabled={actionLoading === 'resend_verification'}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {actionLoading === 'resend_verification' ? 'Sending...' : 'Resend verification email'}
          </button>
        )}

        {emailMessage && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              emailMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {emailMessage.text}
          </div>
        )}

        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            Change email address
          </button>
        ) : (
          <form onSubmit={handleEmailUpdate} className="mt-4 space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail('');
                  setEmailMessage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={emailSaving}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50"
              >
                {emailSaving ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Password */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Password</h3>
            <p className="text-sm text-gray-500">
              {data.hasPassword ? 'Password is set' : 'No password set (using social login)'}
            </p>
          </div>
        </div>

        {passwordMessage && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        {!showPasswordForm ? (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {data.hasPassword ? 'Change Password' : 'Set Password'}
            </button>
            {data.hasPassword && (
              <button
                onClick={handlePasswordReset}
                disabled={actionLoading === 'request_password_reset'}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-50"
              >
                {actionLoading === 'request_password_reset' ? 'Sending...' : 'Forgot password?'}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            {data.hasPassword && (
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
                minLength={6}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordMessage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50"
              >
                {passwordSaving ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Linked Accounts */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Linked Accounts</h3>
            <p className="text-sm text-gray-500">Connect additional sign-in methods</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Apple */}
          {(() => {
            const appleIdentity = data.linkedProviders.find((p) => p.provider === 'apple');
            return (
              <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Apple</p>
                    {appleIdentity && (
                      <p className="text-xs text-gray-500">
                        {appleIdentity.identity_data.email || 'Connected'}
                      </p>
                    )}
                  </div>
                </div>
                {appleIdentity ? (
                  <button
                    onClick={() => handleUnlinkProvider(appleIdentity.id)}
                    disabled={actionLoading === 'unlink_provider'}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                  >
                    <Link2Off className="h-3 w-3" />
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => handleLinkProvider('apple')}
                    disabled={actionLoading === 'link_provider'}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                  >
                    <Link2 className="h-3 w-3" />
                    Link
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500">Add an extra layer of security</p>
          </div>
          {data.mfa.enabled && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="h-4 w-4" />
              Enabled
            </span>
          )}
        </div>

        {mfaMessage && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              mfaMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {mfaMessage.text}
          </div>
        )}

        {data.mfa.enabled ? (
          <div className="space-y-3">
            {data.mfa.factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{factor.friendly_name}</p>
                    <p className="text-xs text-gray-500">
                      Added {new Date(factor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnenrollMfa(factor.id)}
                  disabled={actionLoading === 'unenroll_mfa'}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : showMfaSetup ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scan this QR code with your authenticator app (like Google Authenticator or 1Password):
            </p>
            {mfaQrCode && (
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>
            )}
            {mfaSecret && (
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded font-mono">
                  {mfaSecret}
                </code>
              </div>
            )}
            <form onSubmit={handleVerifyMfa} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Verification Code</label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-center font-mono tracking-widest focus:outline-none focus:border-gray-400"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaSetup(false);
                    setMfaQrCode(null);
                    setMfaSecret(null);
                    setMfaFactorId(null);
                    setMfaCode('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mfaSaving || mfaCode.length !== 6}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50"
                >
                  {mfaSaving ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={handleEnrollMfa}
            disabled={mfaSaving}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50"
          >
            {mfaSaving ? 'Setting up...' : 'Set up two-factor authentication'}
          </button>
        )}
      </section>

      {/* Session Management */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Sessions</h3>
            <p className="text-sm text-gray-500">
              Last sign in: {data.lastSignIn ? new Date(data.lastSignIn).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOutAll}
          disabled={actionLoading === 'sign_out_all'}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {actionLoading === 'sign_out_all' ? 'Signing out...' : 'Sign out from all devices'}
        </button>
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'An unexpected error occurred';
}
