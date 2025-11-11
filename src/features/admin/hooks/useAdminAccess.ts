'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AdminAccessState {
  user: User | null;
  isAdmin: boolean;
  authChecked: boolean;
}

export function useAdminAccess(): AdminAccessState {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setUser(null);
        setIsAdmin(false);
        setAuthChecked(true);
        router.push('/account');
        return;
      }

      setUser(session.user);
      const role = (session.user.app_metadata as Record<string, unknown> | null)?.role;
      const admin = role === 'admin';
      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) {
        router.push('/account');
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return { user, isAdmin, authChecked };
}
