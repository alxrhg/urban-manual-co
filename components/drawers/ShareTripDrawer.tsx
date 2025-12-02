'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useAuth } from '@/contexts/AuthContext';
import {
  Link2,
  Copy,
  Check,
  X,
  Loader2,
  UserPlus,
  Trash2,
  Mail,
  Globe,
  Lock,
  Users,
  Crown,
  Edit3,
  Eye,
} from 'lucide-react';
import type { Trip, TripShare, TripCollaborator, TripInvite } from '@/types/trip';

interface ShareTripDrawerProps {
  trip: Trip;
  isOwner: boolean;
  onShareCreated?: (share: TripShare) => void;
  onCollaboratorAdded?: (collaborator: TripCollaborator) => void;
  onCollaboratorRemoved?: (collaboratorId: string) => void;
}

export default function ShareTripDrawer({
  trip,
  isOwner,
  onShareCreated,
  onCollaboratorAdded,
  onCollaboratorRemoved,
}: ShareTripDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<TripShare | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [copied, setCopied] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Actions
  const [creatingShare, setCreatingShare] = useState(false);
  const [deletingShare, setDeletingShare] = useState(false);

  // Fetch share and collaborators
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch share link
      const shareRes = await fetch(`/api/trips/${trip.id}/share`);
      if (shareRes.ok) {
        const shareData = await shareRes.json();
        setShare(shareData.share);
        setShareUrl(shareData.shareUrl);
      }

      // Fetch collaborators
      const collabRes = await fetch(`/api/trips/${trip.id}/collaborators`);
      if (collabRes.ok) {
        const collabData = await collabRes.json();
        setCollaborators(collabData.collaborators || []);
        setInvites(collabData.invites || []);
      }
    } catch (err) {
      console.error('Error fetching share data:', err);
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create share link
  const handleCreateShare = async () => {
    try {
      setCreatingShare(true);
      const res = await fetch(`/api/trips/${trip.id}/share`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.errors?.[0]?.message || 'Failed to create share link');
      }

      const data = await res.json();
      setShare(data.share);
      setShareUrl(data.shareUrl);
      onShareCreated?.(data.share);
    } catch (err) {
      console.error('Error creating share:', err);
    } finally {
      setCreatingShare(false);
    }
  };

  // Delete share link
  const handleDeleteShare = async () => {
    try {
      setDeletingShare(true);
      const res = await fetch(`/api/trips/${trip.id}/share`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete share link');
      }

      setShare(null);
      setShareUrl(null);
    } catch (err) {
      console.error('Error deleting share:', err);
    } finally {
      setDeletingShare(false);
    }
  };

  // Copy share link
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Invite collaborator
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setInviteError(null);

      const res = await fetch(`/api/trips/${trip.id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Failed to send invite');
      }

      if (data.collaborator) {
        setCollaborators((prev) => [...prev, data.collaborator]);
        onCollaboratorAdded?.(data.collaborator);
      } else if (data.invite) {
        setInvites((prev) => [...prev, data.invite]);
      }

      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const res = await fetch(
        `/api/trips/${trip.id}/collaborators?collaboratorId=${collaboratorId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Failed to remove collaborator');
      }

      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      onCollaboratorRemoved?.(collaboratorId);
    } catch (err) {
      console.error('Error removing collaborator:', err);
    }
  };

  // Cancel invite
  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(
        `/api/trips/${trip.id}/collaborators?inviteId=${inviteId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Failed to cancel invite');
      }

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error('Error canceling invite:', err);
    }
  };

  // Update collaborator role
  const handleUpdateRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      const res = await fetch(`/api/trips/${trip.id}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaboratorId,
          role: newRole,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update role');
      }

      setCollaborators((prev) =>
        prev.map((c) => (c.id === collaboratorId ? { ...c, role: newRole } : c))
      );
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
          Share Trip
        </h2>
        <button
          onClick={closeDrawer}
          className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </div>

      {/* Share Link Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Share Link
          </span>
        </div>

        {share && shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <Link2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 text-sm bg-transparent text-stone-600 dark:text-stone-300 truncate outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-500" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Eye className="w-3.5 h-3.5" />
                <span>Anyone with the link can view</span>
              </div>
              {isOwner && (
                <button
                  onClick={handleDeleteShare}
                  disabled={deletingShare}
                  className="text-xs text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  {deletingShare ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : isOwner ? (
          <button
            onClick={handleCreateShare}
            disabled={creatingShare}
            className="w-full py-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            {creatingShare ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Create share link
          </button>
        ) : (
          <p className="text-sm text-stone-500">No share link available</p>
        )}
      </div>

      {/* Collaborators Section */}
      <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Collaborators
          </span>
        </div>

        {/* Invite Form (only for owners) */}
        {isOwner && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInvite();
                    }
                  }}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {inviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </button>
            </div>
            {inviteError && (
              <p className="text-xs text-red-600">{inviteError}</p>
            )}
          </div>
        )}

        {/* Collaborator List */}
        <div className="space-y-2">
          {/* Owner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
            <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                {user?.user_metadata?.full_name || user?.email || 'You'}
              </p>
              <p className="text-xs text-stone-500">Owner</p>
            </div>
          </div>

          {/* Accepted Collaborators */}
          {collaborators
            .filter((c) => c.status === 'accepted')
            .map((collab) => (
              <div
                key={collab.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800"
              >
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                  {collab.role === 'editor' ? (
                    <Edit3 className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-stone-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                    {collab.user?.user_metadata?.full_name ||
                      collab.user?.email ||
                      collab.invited_email ||
                      'User'}
                  </p>
                  <p className="text-xs text-stone-500 capitalize">{collab.role}</p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <select
                      value={collab.role}
                      onChange={(e) =>
                        handleUpdateRole(collab.id, e.target.value as 'editor' | 'viewer')
                      }
                      className="text-xs px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-transparent text-stone-600 dark:text-stone-400"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveCollaborator(collab.id)}
                      className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    >
                      <X className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>
                )}
              </div>
            ))}

          {/* Pending Collaborators */}
          {collaborators
            .filter((c) => c.status === 'pending')
            .map((collab) => (
              <div
                key={collab.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-stone-200 dark:border-stone-700"
              >
                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
                    {collab.invited_email || 'Pending user'}
                  </p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-stone-500" />
                  </button>
                )}
              </div>
            ))}

          {/* Pending Invites (for non-registered users) */}
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-stone-200 dark:border-stone-700"
            >
              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                <Mail className="w-4 h-4 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
                  {invite.email}
                </p>
                <p className="text-xs text-amber-600">
                  Invited ({invite.role})
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              )}
            </div>
          ))}

          {collaborators.length === 0 && invites.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-4">
              No collaborators yet
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
        <div className="flex gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-medium">Permissions</p>
            <ul className="space-y-0.5 text-blue-600 dark:text-blue-500">
              <li>Editors can add, edit, and remove items</li>
              <li>Viewers can only view the trip</li>
              <li>Share link is view-only (no login required)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
