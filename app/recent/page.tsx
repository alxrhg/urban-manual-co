'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecentPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/account/history#visited-places');
  }, [router]);

  return null;
}

