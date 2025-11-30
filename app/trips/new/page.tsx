'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function NewTripPage() {
  const router = useRouter();

  useEffect(() => {
    const createTrip = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Journey',
          status: 'planning',
        })
        .select()
        .single();

      if (data) {
        router.replace(`/trips/${data.id}?edit=true`);
      }
    };

    createTrip();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-stone-400 mb-4" />
      <p className="text-stone-500 font-light">Starting new journey...</p>
    </div>
  );
}
