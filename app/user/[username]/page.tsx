'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { PageShell } from '@/components/PageShell';
import { PageContainer } from '@/components/PageContainer';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      // First, get user_id from username
      const response = await fetch(`/api/users/search?q=${username}`);
      const { users } = await response.json();

      const userProfile = users?.find((u: any) => u.username === username);
      if (!userProfile) {
        router.push('/404');
        return;
      }

      // Get full profile
      const profileResponse = await fetch(`/api/users/${userProfile.user_id}`);
      const data = await profileResponse.json();

      setProfile(data.profile);
      setStats(data.stats);
      setCollections(data.collections);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/users/${profile.user_id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
      } else {
        await fetch(`/api/users/${profile.user_id}/follow`, { method: 'POST' });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <main className="min-h-[60vh] flex items-center">
          <PageContainer width="standard">
            <div className="flex justify-center py-20">
              <PageLoader />
            </div>
          </PageContainer>
        </main>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell>
        <main className="min-h-[60vh] flex items-center">
          <PageContainer width="standard">
            <div className="text-center space-y-4 py-20">
              <h1 className="text-2xl font-semibold tracking-tight">User not found</h1>
              <button
                onClick={() => router.push('/')}
                className="text-xs font-medium uppercase tracking-[2px] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Go back home
              </button>
            </div>
          </PageContainer>
        </main>
      </PageShell>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user_id;

  return (
    <PageShell>
      <main className="min-h-screen">
        <PageContainer className="py-12 lg:py-16 space-y-16">
          <section className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 shadow-sm">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-400 dark:text-gray-600">
                  {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Member Profile</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      {profile.display_name || profile.username}
                    </h1>
                  </div>

                  {profile.username && (
                    <p className="text-xs uppercase tracking-[2px] text-gray-400">@{profile.username}</p>
                  )}

                  {profile.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {profile.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {!isOwnProfile && currentUser && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`px-6 py-2 text-xs font-semibold uppercase tracking-[2px] rounded-full transition-all ${
                        isFollowing
                          ? 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                          : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                      }`}
                    >
                      {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/account')}
                      className="px-6 py-2 text-xs font-semibold uppercase tracking-[2px] border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm p-5">
                  <dt className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Visited</dt>
                  <dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.visitedCount}</dd>
                </div>
                <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm p-5">
                  <dt className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Saved</dt>
                  <dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.savedCount}</dd>
                </div>
                <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm p-5">
                  <dt className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Followers</dt>
                  <dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.followerCount}</dd>
                </div>
                <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm p-5">
                  <dt className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Following</dt>
                  <dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.followingCount}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                  Collections
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {isOwnProfile ? 'Your Public Collections' : 'Public Collections'}
                </h2>
              </div>
            </div>

            {collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                No public collections yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => router.push(`/collection/${collection.id}`)}
                    className="group text-left rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{collection.emoji || '📚'}</span>
                      <h3 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {collection.name}
                      </h3>
                    </div>
                    {collection.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {collection.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs uppercase tracking-[2px] text-gray-400">
                      <span>{collection.destination_count || 0} places</span>
                      {collection.view_count > 0 && <span>{collection.view_count} views</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </PageContainer>
      </main>
    </PageShell>
  );
}
