'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SavedPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/account/history#saved-places');
  }, [router]);

  return null;
}

