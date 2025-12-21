"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import {
  Share2,
  Users,
  Link2,
  Copy,
  Check,
  Trash2,
  Mail,
  Loader2,
  Globe,
  Lock,
  UserPlus,
  Crown,
  Pencil,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/ui/button';
import { toast } from '@/ui/sonner';
import type { Trip, TripCollaborator, CollaboratorRole } from '@/types/trip';

interface ShareTripDrawerProps {
  trip: Trip;
  onUpdate?: () => void;
}

interface CollaboratorWithProfile extends TripCollaborator {
  profile?: {
    user_id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

/**
 * ShareTripDrawer - Manage trip sharing and collaborators
 */
export default function ShareTripDrawer({ trip, onUpdate }: ShareTripDrawerProps) {
  const { user } = useAuth();
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);

  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorWithProfile[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>('private');
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [inviting, setInviting] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Actions state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  // Fetch collaborators
  const fetchCollaborators = useCallback(async () => {
    if (!trip?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/trips/${trip.id}/collaborators`);
      const data = await response.json();

      if (data.success) {
        setCollaborators(data.data.collaborators || []);
        setIsOwner(data.data.isOwner);
        if (data.data.migrationRequired) {
          setMigrationRequired(true);
        }
      }

      // Fetch share status
      const shareResponse = await fetch(`/api/trips/${trip.id}/share`);
      const shareData = await shareResponse.json();

      if (shareData.success) {
        setVisibility(shareData.data.visibility || 'private');
        setShareSlug(shareData.data.shareSlug);
        if (shareData.data.shareSlug) {
          setShareUrl(`${window.location.origin}/trips/shared/${shareData.data.shareSlug}`);
        }
        if (shareData.data.migrationRequired) {
          setMigrationRequired(true);
        }
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast.error('Failed to load sharing settings');
    } finally {
      setLoading(false);
    }
  }, [trip?.id]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  // Invite collaborator
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(`/api/trips/${trip.id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        fetchCollaborators();
        onUpdate?.();
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Remove collaborator
  const handleRemove = async (collaboratorId: string) => {
    try {
      setRemovingId(collaboratorId);
      const response = await fetch(`/api/trips/${trip.id}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Collaborator removed');
        fetchCollaborators();
        onUpdate?.();
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    } finally {
      setRemovingId(null);
    }
  };

  // Update collaborator role
  const handleUpdateRole = async (collaboratorId: string, newRole: CollaboratorRole) => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/collaborators/${collaboratorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Role updated');
        fetchCollaborators();
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  // Generate public share link
  const handleGenerateLink = async () => {
    try {
      setGeneratingLink(true);
      const response = await fetch(`/api/trips/${trip.id}/share`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        const newShareUrl = `${window.location.origin}${data.data.shareUrl}`;
        setShareSlug(data.data.trip.share_slug);
        setShareUrl(newShareUrl);
        setVisibility('public');
        toast.success('Share link created');
        onUpdate?.();
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to create share link');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Revoke public share link
  const handleRevokeLink = async () => {
    try {
      setRevokingLink(true);
      const response = await fetch(`/api/trips/${trip.id}/share`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShareSlug(null);
        setShareUrl('');
        setVisibility(collaborators.length > 0 ? 'shared' : 'private');
        toast.success('Share link revoked');
        onUpdate?.();
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to revoke share link');
      }
    } catch (error) {
      console.error('Error revoking link:', error);
      toast.error('Failed to revoke share link');
    } finally {
      setRevokingLink(false);
    }
  };

  // Copy share link
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Get role icon
  const getRoleIcon = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'editor':
        return <Pencil className="w-3.5 h-3.5 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  // Get visibility icon
  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'shared':
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <Lock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <p className="text-xs text-gray-500">Loading sharing settings...</p>
      </div>
    );
  }

  // Show migration required notice
  if (migrationRequired) {
    return (
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share Trip</h2>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Migration notice */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Database Setup Required
            </h3>
            <p className="text-xs text-gray-500 max-w-xs">
              The trip sharing feature requires a database migration. Please run the migration in your Supabase dashboard to enable sharing.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 w-full">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Migration file:
            </p>
            <code className="text-xs text-gray-500 dark:text-gray-400 break-all">
              supabase/migrations/440_trip_collaborators.sql
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share Trip</h2>
        </div>
        <button
          onClick={closeDrawer}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current visibility status */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        {getVisibilityIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {visibility === 'public' ? 'Public' : visibility === 'shared' ? 'Shared with collaborators' : 'Private'}
          </p>
          <p className="text-xs text-gray-500">
            {visibility === 'public'
              ? 'Anyone with the link can view'
              : visibility === 'shared'
              ? `${collaborators.filter(c => c.status === 'accepted').length} collaborator(s)`
              : 'Only you can access'}
          </p>
        </div>
      </div>

      {/* Invite collaborators (owner only) */}
      {isOwner && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Invite Collaborators</h3>
          </div>

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
                className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="w-full rounded-xl"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Collaborators list */}
      {collaborators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Collaborators ({collaborators.length})
            </h3>
          </div>

          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    {collab.profile?.display_name?.[0]?.toUpperCase() ||
                      collab.profile?.username?.[0]?.toUpperCase() ||
                      collab.email[0].toUpperCase()}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {collab.profile?.display_name || collab.profile?.username || collab.email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {getRoleIcon(collab.role)}
                        {collab.role}
                      </span>
                      {collab.status === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions (owner only, can't remove self) */}
                {isOwner && collab.userId !== user?.id && (
                  <div className="flex items-center gap-2">
                    {collab.status === 'accepted' && (
                      <select
                        value={collab.role}
                        onChange={(e) => handleUpdateRole(collab.id, e.target.value as CollaboratorRole)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleRemove(collab.id)}
                      disabled={removingId === collab.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {removingId === collab.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public share link (owner only) */}
      {isOwner && (
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Public Link</h3>
          </div>

          {shareSlug ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-400 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              <Button
                variant="outline"
                onClick={handleRevokeLink}
                disabled={revokingLink}
                className="w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {revokingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke Public Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Generate a public link that allows anyone to view this trip.
              </p>
              <Button
                variant="outline"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="w-full rounded-xl"
              >
                {generatingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Create Public Link
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Warning for non-owners */}
      {!isOwner && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">
            Only the trip owner can manage sharing settings and invite collaborators.
          </p>
        </div>
      )}
    </div>
  );
}
