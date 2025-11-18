'use client';

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  LinkIcon,
  MailIcon,
  MessageSquareIcon,
  CheckIcon,
  UserPlusIcon,
  TrashIcon,
  EyeIcon,
  EditIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TripShare } from '@/types/trip';

interface TripShareModalProps {
  tripName: string;
  tripId?: string;
  isPublic?: boolean;
  onClose: () => void;
  onUpdatePublic?: (isPublic: boolean) => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
}

export function TripShareModal({ 
  tripName, 
  tripId,
  isPublic = false,
  onClose,
  onUpdatePublic 
}: TripShareModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shares, setShares] = useState<(TripShare & { user?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/trip/${tripName.toLowerCase().replace(/\s+/g, '-')}` 
    : '';

  // Load existing shares if tripId is provided
  useEffect(() => {
    if (tripId && user) {
      loadShares();
    }
  }, [tripId, user]);

  const loadShares = async () => {
    if (!tripId) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;

      // Fetch user profiles for each share
      if (data && data.length > 0) {
        const userIds = data.map(s => s.shared_with_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const sharesWithUsers = data.map(share => ({
          ...share,
          user: profiles?.find(p => p.id === share.shared_with_user_id)
        }));

        setShares(sharesWithUsers);
      }
    } catch (err) {
      console.error('Error loading shares:', err);
    }
  };

  const handleAddShare = async () => {
    if (!tripId || !user || !shareEmail) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', shareEmail.toLowerCase())
        .limit(1);

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        setError('User not found with that email');
        setLoading(false);
        return;
      }

      const targetUser = profiles[0];

      // Create share
      const { error: shareError } = await supabase
        .from('trip_shares')
        .insert({
          trip_id: tripId,
          shared_with_user_id: targetUser.id,
          shared_by_user_id: user.id,
          permission_level: sharePermission
        });

      if (shareError) {
        if (shareError.code === '23505') { // Unique constraint violation
          setError('Trip is already shared with this user');
        } else {
          throw shareError;
        }
        setLoading(false);
        return;
      }

      // Reload shares
      await loadShares();
      setShareEmail('');
      setSharePermission('view');
    } catch (err: any) {
      console.error('Error adding share:', err);
      setError(err.message || 'Failed to share trip');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!tripId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('trip_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      // Reload shares
      await loadShares();
    } catch (err) {
      console.error('Error removing share:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailShare = () => {
    window.location.href = `mailto:${email}?subject=Check out my trip: ${tripName}&body=I wanted to share my trip itinerary with you: ${shareUrl}`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-950 w-full max-w-md border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-8 py-6 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-950">
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
            Share Trip
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          {/* Public/Private Toggle */}
          {tripId && onUpdatePublic && (
            <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Make trip public
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Anyone with the link can view
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => onUpdatePublic(e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* Share with specific users */}
          {tripId && (
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Share with Users
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                    disabled={loading}
                  />
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                    className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 text-sm"
                    disabled={loading}
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button
                    onClick={handleAddShare}
                    disabled={!shareEmail || loading}
                    className="px-4 py-2 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-30"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                )}

                {/* List of shared users */}
                {shares.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-neutral-900 dark:text-neutral-100">
                              {share.user?.full_name || share.user?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {share.user?.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            {share.permission_level === 'edit' ? (
                              <EditIcon className="w-3 h-3" />
                            ) : (
                              <EyeIcon className="w-3 h-3" />
                            )}
                            <span>{share.permission_level}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Copy Link */}
          <div>
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-gray-900"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Link copied to clipboard!
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Share via Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
              <button
                onClick={handleEmailShare}
                disabled={!email}
                className="px-4 py-3 border border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-900 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MailIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

