'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, Check, Link2, Mail, Globe, Lock, Users, Twitter, Facebook } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import type { TripCollaborator } from '@/types/features';

interface TripShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

export function TripShareModal({ isOpen, onClose, tripId, tripTitle }: TripShareModalProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');

  // Fetch sharing info
  useEffect(() => {
    if (!isOpen) return;

    const fetchShareInfo = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/trips/${tripId}/share`);
        if (res.ok) {
          const data = await res.json();
          setIsPublic(data.is_public);
          setShareUrl(data.share_url);
          setCollaborators(data.collaborators || []);
        }
      } catch (err) {
        console.error('Failed to fetch share info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareInfo();
  }, [isOpen, tripId]);

  // Toggle public sharing
  const handleTogglePublic = useCallback(async (value: boolean) => {
    setIsPublic(value);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.share_url);
      }
    } catch (err) {
      console.error('Failed to update sharing:', err);
      setIsPublic(!value); // Revert
    }
  }, [tripId]);

  // Copy link
  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  // Invite collaborator
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to invite');
      }

      const { collaborator } = await res.json();
      setCollaborators((prev) => [...prev, collaborator]);
      setInviteEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite collaborator');
    } finally {
      setIsInviting(false);
    }
  }, [tripId, inviteEmail, inviteRole]);

  // Remove collaborator
  const handleRemoveCollaborator = useCallback(async (collabId: string) => {
    try {
      await fetch(`/api/trips/${tripId}/collaborators/${collabId}`, {
        method: 'DELETE',
      });
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    }
  }, [tripId]);

  // Social share
  const shareToTwitter = () => {
    if (!shareUrl) return;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my trip: ${tripTitle}`)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const shareToFacebook = () => {
    if (!shareUrl) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Share &quot;{tripTitle}&quot; with others or invite collaborators to plan together.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Public Link Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="font-medium">Public Link</p>
                  <p className="text-sm text-gray-500">
                    {isPublic ? 'Anyone with the link can view' : 'Only you and collaborators can access'}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
            </div>

            {/* Share Link */}
            {isPublic && shareUrl && (
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="font-mono text-sm" />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Social Share */}
                <div className="flex gap-2">
                  <Button onClick={shareToTwitter} variant="outline" size="sm" className="flex-1">
                    <Twitter className="h-4 w-4 mr-2" /> Twitter
                  </Button>
                  <Button onClick={shareToFacebook} variant="outline" size="sm" className="flex-1">
                    <Facebook className="h-4 w-4 mr-2" /> Facebook
                  </Button>
                </div>
              </div>
            )}

            {/* Invite Collaborators */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <Label>Invite Collaborators</Label>
              </div>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting ? '...' : 'Invite'}
                </Button>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Collaborators List */}
              {collaborators.length > 0 && (
                <div className="space-y-2 mt-4">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{collab.email}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {collab.role} · {collab.status}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collab.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
