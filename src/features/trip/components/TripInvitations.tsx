'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Check, X, Loader2, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/ui/button';
import { toast } from '@/ui/sonner';
import { formatDestinationsFromField } from '@/types/trip';

interface TripInvitation {
  id: string;
  trip_id: string;
  email: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  trip: {
    id: string;
    title: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    cover_image: string | null;
  } | null;
  inviter: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

interface TripInvitationsProps {
  className?: string;
  onAccept?: () => void;
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * TripInvitations - Show pending trip invitations
 */
export default function TripInvitations({ className = '', onAccept }: TripInvitationsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/trips/invitations');
      const data = await response.json();

      if (data.success) {
        setInvitations(data.data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Handle accept/decline
  const handleResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      setProcessingId(invitationId);

      const response = await fetch(`/api/trips/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        if (action === 'accept') {
          toast.success('You have joined the trip!');
          onAccept?.();
          // Navigate to the trip
          const invitation = invitations.find(i => i.id === invitationId);
          if (invitation?.trip_id) {
            router.push(`/trips/${invitation.trip_id}`);
          }
        } else {
          toast.success('Invitation declined');
        }
        // Remove from list
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        toast.error(data.errors?.[0]?.message || 'Failed to process invitation');
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      toast.error('Failed to process invitation');
    } finally {
      setProcessingId(null);
    }
  };

  // Don't show if no invitations or loading
  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Trip Invitations ({invitations.length})
        </h2>
      </div>

      <div className="space-y-2">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20"
          >
            {/* Trip info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Cover image */}
              {invitation.trip?.cover_image ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={invitation.trip.cover_image}
                    alt={invitation.trip.title || 'Trip'}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {invitation.trip?.title || 'Untitled Trip'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {invitation.trip?.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatDestinationsFromField(invitation.trip.destination)}
                    </span>
                  )}
                  {invitation.trip?.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateRange(invitation.trip.start_date, invitation.trip.end_date)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">
                    {invitation.inviter?.display_name || invitation.inviter?.username || 'Someone'}
                  </span>
                  {' invited you as '}
                  <span className="font-medium">{invitation.role}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResponse(invitation.id, 'decline')}
                disabled={processingId === invitation.id}
                className="rounded-full"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-1">Decline</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleResponse(invitation.id, 'accept')}
                disabled={processingId === invitation.id}
                className="rounded-full"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span className="ml-1">Accept</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
