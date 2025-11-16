import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAccountShell() {
  const auth = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rawBuildVersion, setRawBuildVersion] = useState<string | null>(null);
  const isAdmin = useMemo(() => {
    const role = (auth.user?.app_metadata as Record<string, unknown> | undefined)?.role;
    return role === 'admin';
  }, [auth.user?.app_metadata]);

  // Fetch user profile and avatar when auth changes.
  useEffect(() => {
    async function fetchProfile() {
      if (!auth.user?.id) {
        setAvatarUrl(null);
        return;
      }

      try {
    const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', auth.user.id)
          .maybeSingle();

        if (!error && data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
      }
    }

    fetchProfile();
  }, [auth.user?.id]);

  useEffect(() => {
    async function fetchBuildVersion() {
      if (!isAdmin) return;
      try {
        const versionRes = await fetch('/api/build-version');
        const versionData = await versionRes.json();
        setRawBuildVersion(
          versionData.shortSha ||
          versionData.commitSha?.substring(0, 7) ||
          versionData.version ||
          null,
        );
      } catch {
        setRawBuildVersion(null);
      }
    }

    fetchBuildVersion();
  }, [isAdmin]);

  return {
    ...auth,
    avatarUrl,
    buildVersion: isAdmin ? rawBuildVersion : null,
    isAdmin,
  };
}
