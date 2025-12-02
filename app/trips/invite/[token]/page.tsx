'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  MapPin,
  Loader2,
  Check,
  X,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { parseDestinations, formatDestinationsFromField } from '@/types/trip';

interface InviteData {
  invite: {
    id: string;
    email: string;
    role: 'editor' | 'viewer';
    created_at: string;
  };
  trip: {
    id: string;
    title: string;
    destination: string | null;
    cover_image: string | null;
  };
  inviter: {
    display_name?: string;
    avatar_url?: string;
  } | null;
}

/**
 * TripInvitePage - Accept or decline a trip collaboration invite
 */
export default function TripInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { user, loading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/trips/invite/${token}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('This invitation link is invalid or has expired.');
          } else {
            setError('Failed to load invitation. Please try again.');
          }
          return;
        }

        const data = await res.json();
        setInviteData(data);
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Failed to load invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  // Accept invite
  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?returnUrl=/trips/invite/${token}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const res = await fetch(`/api/trips/invite/${token}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Redirect to trip after a short delay
      setTimeout(() => {
        router.push(`/trips/${data.tripId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  // Decline invite
  const handleDecline = async () => {
    try {
      setDeclining(true);

      const res = await fetch(`/api/trips/invite/${token}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to decline invitation');
      }

      router.push('/trips');
    } catch (err) {
      console.error('Error declining invite:', err);
      setError('Failed to decline invitation');
    } finally {
      setDeclining(false);
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 bg-stone-50 dark:bg-gray-950 min-h-screen">
        <PageLoader />
      </main>
    );
  }

  // Error state
  if (error && !inviteData) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-medium text-stone-900 dark:text-white mb-2">
            Invitation Not Found
          </h1>
          <p className="text-sm text-stone-500 dark:text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
          >
            Go to My Trips
          </Link>
        </div>
      </main>
    );
  }

  // Success state
  if (success) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-medium text-stone-900 dark:text-white mb-2">
            You're In!
          </h1>
          <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">
            Redirecting you to the trip...
          </p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-stone-400" />
        </div>
      </main>
    );
  }

  if (!inviteData) {
    return null;
  }

  const { invite, trip, inviter } = inviteData;
  const destinations = formatDestinationsFromField(trip.destination);

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-md mx-auto">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-stone-200 dark:border-gray-800 overflow-hidden">
          {/* Cover Image */}
          {trip.cover_image && (
            <div className="relative w-full h-40">
              <Image
                src={trip.cover_image}
                alt={trip.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-medium text-stone-900 dark:text-white text-center mb-2">
              You're Invited!
            </h1>

            {/* Inviter */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {inviter?.avatar_url ? (
                <Image
                  src={inviter.avatar_url}
                  alt={inviter.display_name || 'Inviter'}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-gray-700" />
              )}
              <span className="text-sm text-stone-500 dark:text-gray-400">
                {inviter?.display_name || 'Someone'} invited you to collaborate
              </span>
            </div>

            {/* Trip Info */}
            <div className="p-4 bg-stone-50 dark:bg-gray-800 rounded-xl mb-6">
              <h2 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
                {trip.title}
              </h2>
              {destinations && (
                <div className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {destinations}
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-gray-800 rounded-full text-xs font-medium text-stone-600 dark:text-gray-300">
                You'll be added as:
                <span className="capitalize font-semibold">{invite.role}</span>
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            {user ? (
              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={accepting || declining}
                  className="w-full py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Accept Invitation
                </button>
                <button
                  onClick={handleDecline}
                  disabled={accepting || declining}
                  className="w-full py-3 rounded-full border border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-300 text-sm font-medium disabled:opacity-50 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  {declining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Decline
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-stone-500 dark:text-gray-400 text-center">
                  Sign in to accept this invitation
                </p>
                <button
                  onClick={handleAccept}
                  className="w-full py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Continue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 dark:text-gray-500 mt-6">
          Invited to: {invite.email}
        </p>
      </div>
    </main>
  );
}
