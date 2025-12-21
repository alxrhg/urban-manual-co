'use client';

import { useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Link2,
  Copy,
  Check,
  Mail,
  Crown,
  Pencil,
  Eye,
  X,
  Loader2,
  Globe,
  Lock,
  Share2,
} from 'lucide-react';
import type { Trip } from '@/types/trip';

interface Collaborator {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted';
  invitedAt: string;
}

interface CollaborationPanelProps {
  trip: Trip;
  collaborators?: Collaborator[];
  currentUserId?: string;
  onInvite?: (email: string, role: 'editor' | 'viewer') => Promise<void>;
  onRemoveCollaborator?: (collaboratorId: string) => Promise<void>;
  onUpdateRole?: (collaboratorId: string, role: 'editor' | 'viewer') => Promise<void>;
  onUpdateVisibility?: (visibility: 'private' | 'shared' | 'public') => Promise<void>;
  className?: string;
}

export default function CollaborationPanel({
  trip,
  collaborators = [],
  currentUserId,
  onInvite,
  onRemoveCollaborator,
  onUpdateRole,
  onUpdateVisibility,
  className = '',
}: CollaborationPanelProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>(
    trip.is_public ? 'public' : 'private'
  );

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trips/${trip.id}?share=true`
    : '';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !onInvite) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    try {
      await onInvite(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      setInviteError('Failed to send invite. Please try again.');
    } finally {
      setIsInviting(false);
    }
  }, [inviteEmail, inviteRole, onInvite]);

  const handleVisibilityChange = useCallback(async (newVisibility: 'private' | 'shared' | 'public') => {
    setVisibility(newVisibility);
    if (onUpdateVisibility) {
      await onUpdateVisibility(newVisibility);
    }
  }, [onUpdateVisibility]);

  const getRoleIcon = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-amber-500" />;
      case 'editor':
        return <Pencil className="w-3 h-3 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-3 h-3 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Can edit';
      case 'viewer':
        return 'View only';
    }
  };

  const getVisibilityIcon = (v: typeof visibility) => {
    switch (v) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'shared':
        return <Users className="w-4 h-4" />;
      case 'public':
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        <Share2 className="w-4 h-4 text-gray-500" />
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
          Share & Collaborate
        </span>
      </div>

      {/* Visibility settings */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
          Trip Visibility
        </span>
        <div className="flex gap-2 mt-2">
          {(['private', 'shared', 'public'] as const).map(v => (
            <button
              key={v}
              onClick={() => handleVisibilityChange(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                visibility === v
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {getVisibilityIcon(v)}
              <span className="capitalize">{v}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          {visibility === 'private' && 'Only you can view this trip'}
          {visibility === 'shared' && 'Only invited collaborators can view'}
          {visibility === 'public' && 'Anyone with the link can view'}
        </p>
      </div>

      {/* Share link */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
          Share Link
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[12px] text-gray-600 dark:text-gray-300 truncate">
              {shareUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Collaborators list */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Collaborators ({collaborators.length + 1})
          </span>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <UserPlus className="w-3 h-3" />
            Invite
          </button>
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 text-[13px] bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="px-2 py-2 text-[12px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">View only</option>
              </select>
            </div>
            {inviteError && (
              <p className="text-[11px] text-red-500 mb-2">{inviteError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isInviting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                Send Invite
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setInviteError(null);
                }}
                className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Owner */}
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300">
              You
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">
              You
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
            <Crown className="w-3 h-3" />
            <span className="text-[10px] font-medium">Owner</span>
          </div>
        </div>

        {/* Collaborators */}
        {collaborators.map(collaborator => (
          <div key={collaborator.id} className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {collaborator.avatar ? (
                <img src={collaborator.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300">
                  {collaborator.email[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate block">
                {collaborator.name || collaborator.email}
              </span>
              {collaborator.status === 'pending' && (
                <span className="text-[10px] text-amber-500">Pending invite</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onUpdateRole && collaborator.role !== 'owner' && (
                <select
                  value={collaborator.role}
                  onChange={(e) => onUpdateRole(collaborator.id, e.target.value as 'editor' | 'viewer')}
                  className="px-2 py-1 text-[11px] bg-gray-100 dark:bg-gray-800 border-0 rounded text-gray-600 dark:text-gray-300"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">View only</option>
                </select>
              )}
              {onRemoveCollaborator && collaborator.role !== 'owner' && (
                <button
                  onClick={() => onRemoveCollaborator(collaborator.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {collaborators.length === 0 && (
          <p className="text-[12px] text-gray-400 text-center py-4">
            No collaborators yet. Invite someone to plan together!
          </p>
        )}
      </div>
    </div>
  );
}
